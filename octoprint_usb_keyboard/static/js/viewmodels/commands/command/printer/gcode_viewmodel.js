function CommandsCommandPrinterGcodeViewModel(params) {
  var self = this
  Lockable.call(self, "gcode", params.locked)
  SelfManaged.call(self, params.parentArray, params.gcodeCommand)
  // console.log("CommandsCommandPrinterGcodeViewModel raw", params)
  // console.log("CommandsCommandPrinterGcodeViewModel self", self)

  self.profile = params.profile;
  self.gcodeCommand = params.gcodeCommand;
  self.id = self.gcodeCommand.id;
  self.code = self.gcodeCommand.code;
}
ko.components.register('sfr-commands-command-printer-gcode', {
  viewModel: CommandsCommandPrinterGcodeViewModel,
  template: { element: 'template-sfr-commands-command-printer-gcode' }
});
