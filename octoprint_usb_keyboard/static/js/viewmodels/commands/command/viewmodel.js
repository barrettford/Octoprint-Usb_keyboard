function CommandsCommandViewModel(params) {
  var self = this
  Lockable.call(self, "commands")
  Expandable.call(self, "commands")
  SelfManaged.call(self, params.parentArray, params.commandObject)
  KeyDiscoverable.call(self, params.commandObject.key, params.root)
  ShowsInfo.call(self)
  // console.log("CommandsCommandViewModel raw", params)
  // console.log("CommandsCommandViewModel self", self)

  self.profile = params.profile
  self.profileNames = params.profileNames
  self.command = params.commandObject.key
  self.alias = params.commandObject.alias
  self.pressed = params.commandObject.value.pressed
  self.released = params.commandObject.value.released
  self.variables = params.commandObject.value.variables
  self.allowedVariables = params.allowedVariables
  self.allowedCommandActions = ["octoprint", "printer", "plugin_psucontrol", "save_vars", "listen_vars", "set_active_profile"]

  self.commandText = ko.pureComputed(function() {
    if (self.alias() == null || self.alias === "") {
      return self.command();
    }
    return self.alias() + " '" + self.command() + "'";
  });

  self.newCommandAction = ko.observable()

  self.createCommandAction = function(list) {
    var type = self.newCommandAction()
    var newCommandActionMap = {"type":type}
    switch(type) {
      case "printer":
        newCommandActionMap["gcode"] = []
        newCommandActionMap["options"] = ""
        break;
      case "save_vars":
      case "listen_vars":
        newCommandActionMap["variables"] = []
        break;
      case "plugin_psucontrol":
        newCommandActionMap["command"] = "on"
        newCommandActionMap["hotend_max"] = 50
        break;
      case "octoprint":
        newCommandActionMap["command"] = "cancel_print"
        newCommandActionMap["presses_required"] = 5
        break;
      case "set_active_profile":
        newCommandActionMap["command"] = "set_active_profile"
        newCommandActionMap["profile"] = null
        break;
      default:
        console.log("We should never get here...")
    }

    list.push(ko.mapping.fromJS(newCommandActionMap))
  }

  self.clearKey = function() {
    self.setKey(null)
  }
}
ko.components.register('sfr-commands-command', {
  viewModel: CommandsCommandViewModel,
  template: { element: 'template-sfr-commands-command' }
});
