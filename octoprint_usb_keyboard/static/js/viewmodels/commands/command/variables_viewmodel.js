function CommandsCommandVariablesViewModel(params) {
  var self = this
  Lockable.call(self, "action", params.locked)
  ShowsInfo.call(self)

  // console.log("CommandsCommandVariablesViewModel raw", params)
  // console.log("CommandsCommandVariablesViewModel self", self)

  self.profile = params.profile;
  self.variables = params.variables;
  self.allowedVariables = params.allowedVariables
  self.newVariableKey = ko.observable(null)
  self.newVariableValue = ko.observable(null)


  // This will be used by every variable-selecting command
  self.localAllowedVariables = ko.pureComputed(function() {
    var variableNames = []
    self.variables().some(function(value) {
      variableNames.push(value.key)
    });

    variableNames = ko.toJS(variableNames)
    return ko.toJS(self.allowedVariables()).filter(function(value, index, arr) {
      return variableNames.indexOf(value) == -1
    });
  });

  this.deleteVariable = function(obj, variable) {
    self.variables.splice(self.variables.indexOf(variable), 1)
  }

  this.addVariable = function() {
    if (self.newVariableKey() == null || self.newVariableValue() == null) {
      return
    }
    self.variables.push({"key":ko.observable(self.newVariableKey()), "value":ko.observable(self.newVariableValue())})
    self.newVariableKey(null)
    self.newVariableValue(null)
  }
}
ko.components.register('sfr-commands-command-variables', {
  viewModel: CommandsCommandVariablesViewModel,
  template: { element: 'template-sfr-commands-command-variables' }
});
