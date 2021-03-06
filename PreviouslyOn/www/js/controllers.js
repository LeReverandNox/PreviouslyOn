/*jslint browser:true this*/
/*global angular window cordova StatusBar console*/

(function () {
    "use strict";

    var controllers = angular.module("previously_on.controllers", []);

    controllers.controller("WelcomeCtrl", function (UserService, $ionicPopup, $state) {
        this.user = {};
        var self = this;

        UserService.getCredentials();
        if (UserService.credentials) {
            $state.go("home.shows", {}, {reload: true});
            return true;
        }

        this.login = function (user) {
            UserService.login(user, function (response) {
                var credentials = {};
                credentials.id = response.data.user.id;
                credentials.login = response.data.user.login;
                credentials.token = response.data.token;
                credentials.rememberMe = user.rememberMe || false;
                UserService.setCredentials(credentials);
                self.user = {};

                $state.go("welcome", {}, {reload: true});
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.user.password = "";
                });
            });
        };

    });

    controllers.controller("HomeCtrl", function ($state, $ionicHistory, UserService, ShowService) {
        UserService.getCredentials();
        if (!UserService.credentials) {
            $state.go("welcome", {}, {reload: true});
            return false;
        }
        if (!UserService.credentials.rememberMe) {
            UserService.clearCredentials();
        }
        UserService.setToken(UserService.credentials.token);
        ShowService.setToken(UserService.credentials.token);

        this.logout = function () {
            UserService.clearCredentials();
            $state.go("welcome", {}, {reload: true});
            return true;
        };
        $ionicHistory.nextViewOptions({
            disableAnimate: true,
            disableBack: true
        });
    });

    controllers.controller("OptionsCtrl", function () {
        console.log("Options");
    });

    controllers.controller("ShowsCtrl", function (ShowService, $ionicModal, $scope, $ionicPopup, $q) {
        this.myShows = null;
        this.showToDetail = null;
        this.episodeToDetail = null;
        this.searchString = "";
        this.searchResults = null;
        this.isShowingUnseenEpisodes = true;
        this.isShowingSeenEpisodes = false;
        this.unseenEpisodes = [];
        this.seenEpisodes = [];
        this.commentString = "";
        var self = this;

        // Chargement des modales
        $ionicModal.fromTemplateUrl("partials/show-details-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.showDetailsModal = modal;
        });

        $ionicModal.fromTemplateUrl("partials/search-show-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.searchShowModal = modal;
        });

        $ionicModal.fromTemplateUrl("partials/episodes-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.episodesModal = modal;
        });

        $ionicModal.fromTemplateUrl("partials/episode-details-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.episodeDetailsModal = modal;
        });

        $ionicModal.fromTemplateUrl("partials/comment-episode-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.commentEpisodeModal = modal;
        });

        this.getMyCurrentShows = function () {
            ShowService.myShows("current", function (shows) {
                $scope.$broadcast("scroll.refreshComplete");
                self.myShows = shows;
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                });
            });
        };

        this.getShowDetails = function (show) {
            self.showToDetail = show;
            $scope.showDetailsModal.show();
        };

        this.hideDetails = function () {
            self.showToDetail = null;
            $scope.showDetailsModal.hide();
            self.getMyCurrentShows();
        };

        this.archiveShow = function (id) {
            ShowService.archiveShow(id, function () {
                $ionicPopup.alert({
                    title: "Well done :)",
                    template: "The show '" + self.showToDetail.title + "' is now archived !"
                }).then(function () {
                    self.hideDetails();
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideDetails();
                });
            });
        };

        this.searchShow = function () {
            $scope.searchShowModal.show();
        };

        this.hideSearch = function () {
            self.searchString = "";
            self.searchResults = null;
            $scope.searchShowModal.hide();
        };

        this.searchFromInput = function (string) {
            if (string.length > 0) {
                ShowService.searchShow(string, function (shows) {
                    self.searchResults = shows;
                }, function (err) {
                    $ionicPopup.alert({
                        title: "Uh-oh... something went wrong !",
                        template: err.data.errors[0].text
                    }).then(function () {
                        self.hideDetails();
                    });
                });
            } else {
                self.searchResults = null;
            }
        };

        this.addShow = function (id) {
            ShowService.addShow(id, function (resp) {
                $ionicPopup.alert({
                    title: "Well done :)",
                    template: "You're now watching the show '" + resp.data.show.title + "' !"
                }).then(function () {
                    self.hideSearch();
                    self.hideDetails();
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideDetails();
                });
            });
        };

        this.showEpisodes = function (show) {
            this.showToDetail = show;

            var promises = [];
            promises[0] = $q(function (resolve, reject) {
                ShowService.getEpisodes("unseen", show.id, function (episodes) {
                    self.unseenEpisodes = episodes;
                    resolve();
                }, function (err) {
                    reject(err);
                });
            });
            promises[1] = $q(function (resolve, reject) {
                ShowService.getEpisodes("seen", show.id, function (episodes) {
                    self.seenEpisodes = episodes;
                    resolve();
                }, function (err) {
                    reject(err);
                });
            });

            $q.all(promises).then(function () {
                $scope.episodesModal.show();
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideDetails();
                });
            });
        };

        this.hideEpisodes = function () {
            $scope.episodesModal.hide();
            self.showUnseenEpisodes();
            self.getMyCurrentShows();
        };

        this.showUnseenEpisodes = function () {
            self.isShowingSeenEpisodes = false;
            self.isShowingUnseenEpisodes = true;
        };

        this.showSeenEpisodes = function () {
            self.isShowingSeenEpisodes = true;
            self.isShowingUnseenEpisodes = false;
        };

        this.getEpisodeDetails = function (episode) {
            self.episodeToDetail = episode;
            self.episodeToDetail.img = ShowService.getEpisodePicture(episode.id);
            $scope.episodeDetailsModal.show();
        };
        this.hideEpisodeDetails = function () {
            this.episodeToDetail = null;
            $scope.episodeDetailsModal.hide();
        };

        this.markEpisodeAsSeen = function (id, bulk) {
            ShowService.markEpisodeAsSeen(id, bulk, function (resp) {
                $ionicPopup.alert({
                    title: "Well done !",
                    template: "You just mark this episode as seen."
                }).then(function () {
                    self.hideEpisodeDetails();
                    self.showEpisodes(resp.data.episode.show);
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideEpisodeDetails();
                    self.hideEpisodes();
                });
            });
        };

        this.showPopupEpisode = function (id) {
            $scope.data = {};
            var myPopup;

            myPopup = $ionicPopup.show({
                template: "What do you want to do ?",
                title: "Manage an episode",
                scope: $scope,
                cssClass: "popup-vertical-buttons",
                buttons: [
                    {
                        text: "Cancel",
                        type: "button-positive"
                    },
                    {
                        text: "<b>Mark as Seen</b>",
                        type: "button-positive",
                        onTap: function () {
                            ShowService.markEpisodeAsSeen(id, false, function (resp) {
                                $ionicPopup.alert({
                                    title: "Well done !",
                                    template: "You just mark this episode as seen."
                                }).then(function () {
                                    self.showEpisodes(resp.data.episode.show);
                                    myPopup.close();
                                });
                            }, function (err) {
                                $ionicPopup.alert({
                                    title: "Uh-oh... something went wrong !",
                                    template: err.data.errors[0].text
                                }).then(function () {
                                    self.hideEpisodes();
                                    myPopup.close();
                                });
                            });
                        }
                    },
                    {
                        text: "<b>Mark as Seen + Previous</b>",
                        type: "button-positive",
                        onTap: function () {
                            ShowService.markEpisodeAsSeen(id, true, function (resp) {
                                $ionicPopup.alert({
                                    title: "Well done !",
                                    template: "You just mark this episode as seen and all the previouses."
                                }).then(function () {
                                    self.showEpisodes(resp.data.episode.show);
                                    myPopup.close();
                                });
                            }, function (err) {
                                $ionicPopup.alert({
                                    title: "Uh-oh... something went wrong !",
                                    template: err.data.errors[0].text
                                }).then(function () {
                                    myPopup.close();
                                    self.hideEpisodes();
                                });
                            });
                        }
                    },
                    {
                        text: "<b>Comment</b>",
                        type: "button-positive",
                        onTap: function () {
                            self.showCommentEpisode(id);
                            myPopup.close();
                        }
                    }
                ]
            });

        };

        this.showCommentEpisode = function (id) {
            self.episodeToComment = id;
            $scope.commentEpisodeModal.show();

        };
        this.hideCommentEpisode = function () {
            this.commentString = "";
            $scope.commentEpisodeModal.hide();
        };

        this.postCommentEpisode = function (message) {
            ShowService.postCommentOnEpisode(self.episodeToComment, message, function () {
                $ionicPopup.alert({
                    title: "Well done !",
                    template: "You just comment this episode."
                }).then(function () {
                    self.hideCommentEpisode();
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideCommentEpisode();
                });
            });
        };

        this.markEpisodeAsUnseen = function (id) {
            ShowService.unmarkEpisodeAsSeen(id, function (resp) {
                $ionicPopup.alert({
                    title: "Well done !",
                    template: "You just mark this episode as unseen."
                }).then(function () {
                    self.hideEpisodeDetails();
                    self.showEpisodes(resp.data.episode.show);
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideEpisodeDetails();
                    self.hideEpisodes();
                });
            });
        };

        $ionicModal.fromTemplateUrl("partials/archived-shows-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.archivedShowsModal = modal;
        });

        this.showArchivedShows = function () {
            ShowService.myShows("archived", function (shows) {
                self.archivedShows = shows;
                $scope.archivedShowsModal.show();
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                });
            });
        };

        this.hideArchivedShows = function () {
            $scope.archivedShowsModal.hide();
        };

        this.unarchiveShow = function (id) {
            ShowService.unarchiveShow(id, function () {
                $ionicPopup.alert({
                    title: "Well done !",
                    template: "You just unarchived this show !"
                }).then(function () {
                    self.hideDetails();
                    self.hideArchivedShows();
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideDetails();
                    self.hideArchivedShows();
                });
            });
        };

        this.deleteShow = function (id) {
            ShowService.deleteShow(id, function () {
                $ionicPopup.alert({
                    title: "Well done !",
                    template: "You have deleted this show !"
                }).then(function () {
                    self.hideDetails();
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideDetails();
                });
            });
        };

        this.getMyCurrentShows();
    });

    controllers.controller("FriendsCtrl", function (UserService, $ionicModal, $scope, $ionicPopup) {
        this.friends = [];
        var self = this;

        this.getFriends = function () {
            UserService.getFriends(false, function (users) {
                self.friends = users;
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                });
            });
        };

        this.manageFriend = function (id) {
            $scope.data = {};
            var myPopup;

            myPopup = $ionicPopup.show({
                template: "What do you want to do ?",
                title: "Manage a friend",
                scope: $scope,
                cssClass: "popup-vertical-buttons",
                buttons: [
                    {
                        text: "Cancel",
                        type: "button-positive"
                    },
                    {
                        text: "<b>Delete</b>",
                        type: "button-assertive",
                        onTap: function () {
                            UserService.deleteFriend(id, function () {
                                $ionicPopup.alert({
                                    title: "Well done !",
                                    template: "You just deleted this friend."
                                }).then(function () {
                                    self.getFriends();
                                    myPopup.close();
                                });
                            }, function (err) {
                                $ionicPopup.alert({
                                    title: "Uh-oh... something went wrong !",
                                    template: err.data.errors[0].text
                                }).then(function () {
                                    myPopup.close();
                                });
                            });
                        }
                    },
                    {
                        text: "<b>Block</b>",
                        type: "button-assertive",
                        onTap: function () {
                            UserService.blockFriend(id, function () {
                                $ionicPopup.alert({
                                    title: "Well done !",
                                    template: "You just blocked this friend."
                                }).then(function () {
                                    self.getFriends();
                                    myPopup.close();
                                });
                            }, function (err) {
                                $ionicPopup.alert({
                                    title: "Uh-oh... something went wrong !",
                                    template: err.data.errors[0].text
                                }).then(function () {
                                    myPopup.close();
                                    self.hideEpisodes();
                                });
                            });
                        }
                    }
                ]
            });

        };

        $ionicModal.fromTemplateUrl("partials/search-user-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.searchUserModal = modal;
        });

        this.searchUser = function () {
            $scope.searchUserModal.show();
        };

        this.hideSearch = function () {
            self.searchString = "";
            self.searchResults = null;
            $scope.searchUserModal.hide();
        };

        this.searchFromInput = function (string) {
            if (string.length > 1) {
                UserService.searchUser(string, function (users) {
                    self.searchResults = users;
                }, function (err) {
                    $ionicPopup.alert({
                        title: "Uh-oh... something went wrong !",
                        template: err.data.errors[0].text
                    }).then(function () {
                        self.hideSearch();
                    });
                });
            } else {
                self.searchResults = null;
            }
        };

        this.addFriend = function (id) {
            UserService.addFriend(id, function (resp) {
                $ionicPopup.alert({
                    title: "Well done :)",
                    template: "You've just added '" + resp.data.member.login + "' to your friends !"
                }).then(function () {
                    self.getFriends();
                    self.hideSearch();
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideSearch();
                });
            });
        };

        $ionicModal.fromTemplateUrl("partials/blocked-users-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.blockedUsersModal = modal;
        });

        this.showBlockedUsers = function () {
            UserService.getFriends(true, function (users) {
                self.blockedUsers = users;
                $scope.blockedUsersModal.show();
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                });
            });
        };

        this.hideBlockedUsers = function () {
            self.getFriends();
            $scope.blockedUsersModal.hide();
        };

        this.unblockFriend = function (id) {
            UserService.unblockFriend(id, function (resp) {
                $ionicPopup.alert({
                    title: "Well done !",
                    template: "The user '" + resp.data.member.login + "' is now unblocked !"
                }).then(function () {
                    self.hideBlockedUsers();
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideBlockedUsers();
                });
            });
        };


        $ionicModal.fromTemplateUrl("partials/friend-requests-modal.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (modal) {
            $scope.friendRequestsModal = modal;
        });

        this.showFriendRequests = function () {
            UserService.getFriendRequests("received", function (requests) {
                self.friendRequests = requests;
                $scope.friendRequestsModal.show();
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                });
            });
        };

        this.hideFriendRequests = function () {
            self.getFriends();
            $scope.friendRequestsModal.hide();
        };

        this.confirmFriendRequest = function (id) {
            UserService.addFriend(id, function (resp) {
                $ionicPopup.alert({
                    title: "Well done :)",
                    template: "You're now friend with '" + resp.data.member.login + "' !"
                }).then(function () {
                    self.getFriends();
                    self.hideFriendRequests();
                });
            }, function (err) {
                $ionicPopup.alert({
                    title: "Uh-oh... something went wrong !",
                    template: err.data.errors[0].text
                }).then(function () {
                    self.hideFriendRequests();
                });
            });
        };

        this.getFriends();
    });
}());