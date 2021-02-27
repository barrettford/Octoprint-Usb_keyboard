function CommandsCommandListenSaveVarsViewModel(params) {
  var self = this
  Lockable.call(self, "action", params.locked)
  SelfManaged.call(self, params.parentArray, params.commandActionObject)
  ShowsInfo.call(self)
  //
  // console.log("CommandsCommandListenSaveVarsViewModel raw", params)
  // console.log("CommandsCommandListenSaveVarsViewModel self", self)

  self.profile = params.profile;
  self.allowedVariables = params.allowedVariables;
  self.type = params.commandActionObject.type;
  self.variables = params.commandActionObject.variables;
}
ko.components.register('sfr-commands-command-listen-save-vars', {
  viewModel: CommandsCommandListenSaveVarsViewModel,
  template: { element: 'template-sfr-commands-command-listen-save-vars' }
});
