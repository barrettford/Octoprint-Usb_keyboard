function CommandsCommandPluginPsucontrolViewModel(params) {
  var self = this
  Lockable.call(self, "action", params.locked)
  SelfManaged.call(self, params.parentArray, params.commandActionObject)
  ShowsInfo.call(self)


  // console.log("CommandsCommandPluginPsucontrolViewModel raw", params)
  // console.log("CommandsCommandPluginPsucontrolViewModel self", self)

  self.profile = params.profile;
  self.type = params.commandActionObject.type;
  self.command = params.commandActionObject.command;
  self.hotendMax = params.commandActionObject.hotend_max.extend({ numeric: 0 });
  self.supportedCommands = ["on", "off", "toggle"]
}
ko.components.register('sfr-commands-command-plugin-psucontrol', {
  viewModel: CommandsCommandPluginPsucontrolViewModel,
  template: { element: 'template-sfr-commands-command-plugin-psucontrol' }
});
