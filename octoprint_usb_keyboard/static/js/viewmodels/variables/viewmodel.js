function VariablesViewModel(params) {
  var self = this
  Lockable.call(self, "variables", params.locked)
  ShowsInfo.call(self)

  // console.log("VariablesViewModel raw", params)
  // console.log("VariablesViewModel self", self)

  self.newVariableKey = ko.observable(null)
  self.newVariableValue = ko.observable(null)
  self.dupeDetected = ko.observable(false)
  self.variables = params.variables


  this.deleteVariable = function(data, event) {
    console.log("data", data)
    self.variables.remove(data)
  }

  this.addVariable = function() {
    if (self.newVariableKey() == null || self.newVariableValue() == null) {
      return
    }

    self.dupeDetected(self.variables().some(function(value) {
      return value.key() == self.newVariableKey()
    }))

    if (! self.dupeDetected()) {
      self.variables.push({"key":ko.observable(self.newVariableKey()), "value":ko.observable(self.newVariableValue())})
      self.newVariableKey(null)
      self.newVariableValue(null)
    }
  }
}
ko.components.register('sfr-variables', {
  viewModel: VariablesViewModel,
  template: { element: 'template-sfr-variables' }
});
