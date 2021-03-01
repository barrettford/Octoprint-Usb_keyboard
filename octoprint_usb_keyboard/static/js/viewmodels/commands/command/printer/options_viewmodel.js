function CommandsCommandPrinterOptionsViewModel(params) {
  var self = this
  Lockable.call(self, "gcode options", params.locked)
  SelfManaged.call(self, params.parentArray, params.options)
  Expandable.call(self, "gcode options")
  ShowsInfo.call(self)

  const PRINTING = "p"
  const PAUSED = "u"
  const FORCE = "f"
  // console.log("CommandsCommandPrinterOptionsViewModel raw", params)
  // console.log("CommandsCommandPrinterOptionsViewModel self", self)


  self.profile = params.profile;
  self.options = params.options;


  self.sendWhilePrinting = ko.pureComputed(function() {
    return self.options().includes(PRINTING);
  });

  self.sendWhilePaused = ko.pureComputed(function() {
    return self.options().includes(PAUSED);
  });

  self.forceSend = ko.pureComputed(function() {
    return self.options().includes(FORCE);
  });


  // Toggling the Options

  self.toggleOption = function(option) {
    var options = self.options()
    if (options.includes(option)) {
      options = options.replace(option, "")
    }
    else {
      options = options + option
    }

    self.options(options)
  }

  self.toggleSendWhilePrinting = function() {
    self.toggleOption(PRINTING)
  }

  self.toggleSendWhilePaused = function() {
    self.toggleOption(PAUSED)
  }

  self.toggleForceSend = function() {
    self.toggleOption(FORCE)
  }


  // Button appearance

  self.sendWhilePrintingClass = ko.pureComputed(function() {
    return self.sendWhilePrinting() ? 'btn-success fa-check' : 'fa-times' ;
  });

  self.sendWhilePausedClass = ko.pureComputed(function() {
    return self.sendWhilePaused() ? 'btn-success fa-check' : 'fa-times' ;
  });

  self.forceSendClass = ko.pureComputed(function() {
    return self.forceSend() ? 'btn-success fa-check' : 'fa-times' ;
  });


}
ko.components.register('sfr-commands-command-printer-options', {
  viewModel: CommandsCommandPrinterOptionsViewModel,
  template: { element: 'template-sfr-commands-command-printer-options' }
});
