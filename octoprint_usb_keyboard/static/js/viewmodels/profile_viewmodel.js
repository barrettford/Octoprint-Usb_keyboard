function ProfileViewModel(params) {
  var self = this
  Lockable.call(self, "profile")
  SelfManaged.call(self, params.profileArray, params.profileObject)
  ShowsInfo.call(self)
  // console.log("ProfileViewModel raw", params)
  // console.log("ProfileViewModel self", self)

  self.activeProfileName = params.activeProfileName
  self.profile = params.profileObject.key
  self.description = params.profileObject.value.description
  self.profileNames = params.profileNames
  self.profileObject = params.profileObject
  self.profileArray = params.profileArray
  self.commands = params.profileObject.value.commands
  self.variables = params.profileObject.value.variables
  self.keyboard = params.profileObject.value.keyboard
  self.dupeDetected = ko.observable(false)

  self.newProfileName = ko.observable(self.profile())

  // This will be used by every variable-selecting command
  self.allowedVariables = ko.pureComputed(function() {
    var allowedVariables = []
    self.variables().some(function(value) {
      allowedVariables.push(value.key)
    })

    return allowedVariables
  });

  self.duplicateProfile = function() {
    var copyName = preventDuplicateProfileNames(self.profile(), null)

    var newProfile = ko.mapping.fromJS(ko.toJS(self.profileObject))
    newProfile.key(copyName)

    self.profileArray.push(newProfile)
    self.activeProfileName(copyName)
  }

  self.editProfileName = function() {
    var newName = self.newProfileName()

    if (newName == self.profile()) {
      return
    }

    newName = preventDuplicateProfileNames(newName, self.profile())
    self.newProfileName(newName)

    if (newName == self.profile()) {
      return
    }

    self.profile(newName)
    self.activeProfileName(newName)
  }

  self.exportProfileData = ko.pureComputed(function() {
    return "data:text/json;charset=utf-8," + encodeURIComponent(ko.toJSON(self.profileObject))
  });

  self.exportProfileName = ko.pureComputed(function() {
    return self.profile() + ".json"
  });
}
ko.components.register('sfr-profile', {
  viewModel: ProfileViewModel,
  template: { element: 'template-sfr-profile' }
});
