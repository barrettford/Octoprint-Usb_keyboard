function CommandsCommandSetActiveProfileViewModel(params) {
  var self = this
  Lockable.call(self, "action", params.locked)
  SelfManaged.call(self, params.parentArray, params.commandActionObject)
  ShowsInfo.call(self)
  // console.log("CommandsCommandSetActiveProfileViewModel raw", params)
  // console.log("CommandsCommandSetActiveProfileViewModel self", self)

  self.profile = params.profile;
  self.profileNames = params.profileNames;
  self.type = params.commandActionObject.type;
  self.profileName = params.commandActionObject.profile;

  self.allowedProfiles = ko.pureComputed(function() {
    var allowedProfiles = ko.toJS(self.profileNames())
    allowedProfiles.splice(allowedProfiles.indexOf(self.profile()), 1)
    return allowedProfiles
  });
}
ko.components.register('sfr-commands-command-set-active-profile', {
  viewModel: CommandsCommandSetActiveProfileViewModel,
  template: { element: 'template-sfr-commands-command-set-active-profile' }
});
