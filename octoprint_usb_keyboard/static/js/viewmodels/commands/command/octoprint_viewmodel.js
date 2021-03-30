function CommandsCommandOctoprintViewModel(params) {
  var self = this
  Lockable.call(self, "action", params.locked)
  SelfManaged.call(self, params.parentArray, params.commandActionObject)
  ShowsInfo.call(self)


  // console.log("CommandsCommandOctoprintViewModel raw", params)
  // console.log("CommandsCommandOctoprintViewModel self", self)

  self.profile = params.profile;
  self.type = params.commandActionObject.type;
  self.command = params.commandActionObject.command;
  self.presses_required = params.commandActionObject.presses_required.extend({ numeric: 0 });
  self.supportedCommands = ["cancel_print",
                            "confirm_last_command",
                            "pause_print",
                            "resume_print",
                            "start_print",
                            "toggle_pause_print",
                            "toggle_cancel_print",
                            "restart_server",
                            "restart_system",
                            "shutdown_system"]
}
ko.components.register('sfr-commands-command-octoprint', {
  viewModel: CommandsCommandOctoprintViewModel,
  template: { element: 'template-sfr-commands-command-octoprint' }
});
