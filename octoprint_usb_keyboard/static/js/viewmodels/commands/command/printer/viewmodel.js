function CommandsCommandPrinterViewModel(params) {
  var self = this
  Lockable.call(self, "action", params.locked)
  SelfManaged.call(self, params.parentArray, params.commandActionObject)
  ShowsInfo.call(self)
  // console.log("CommandsCommandPrinterViewModel raw", params)
  // console.log("CommandsCommandPrinterViewModel self", self)

  self.profile = params.profile;
  self.type = params.commandActionObject.type;
  self.gcode = params.commandActionObject.gcode;
  self.options = params.commandActionObject.options;

  // this will be called when the user clicks the "+" button and add a new row of gcode
  self.addLine = function() {
    self.gcode.push(ko.mapping.fromJS({"code":null, "id":Math.floor((Math.random() * 65535))}));
  };
}
ko.components.register('sfr-commands-command-printer', {
  viewModel: CommandsCommandPrinterViewModel,
  template: { element: 'template-sfr-commands-command-printer' }
});
