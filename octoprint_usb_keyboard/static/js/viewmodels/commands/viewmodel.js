function CommandsViewModel(params) {
  var self = this
  ShowsInfo.call(self)

  // Lockable.call(self, "commands")
  //
  // console.log("CommandsViewModel raw", params)
  // console.log("CommandsViewModel self", self)
  //
  self.commands = params.commands
  self.profile = params.profile
  self.profileNames = params.profileNames
  self.allowedVariables = params.allowedVariables

  self.createCommand = function() {
    var newCommand = "NEW COMMAND"
    var dupeCommand = null;

    self.commands().some(function(value) {
      if (value.key() == newCommand) {
        dupeCommand = value;
        return true;
      }
    });

    if (dupeCommand != null) {
      self.commands.remove(dupeCommand);
      self.commands.unshift(dupeCommand);
    }
    else {
      self.commands.unshift(
        ko.mapping.fromJS(
          {
            "key":newCommand,
            "alias":null,
            "value":{"pressed":[], "released":[], "variables":[]}
          }
        )
      );
    }
  }

}
ko.components.register('sfr-commands', {
  viewModel: CommandsViewModel,
  template: { element: 'template-sfr-commands' }
});
