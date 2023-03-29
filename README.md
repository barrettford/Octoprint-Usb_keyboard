# OctoPrint-Usb_keyboard

Enables users to use a USB keyboard to control their printer through Octoprint.

## Setup

Install via the bundled [Plugin Manager](https://docs.octoprint.org/en/master/bundledplugins/pluginmanager.html)
or manually using this URL:

    https://github.com/barrettford/OctoPrint-Usb_keyboard/archive/master.zip


## Configuration

None. Configure plugin settings through the settings dialog.

### `input` group

If you are not seeing any devices in the "device listener configuration" dialog,
ensure that the user running octoprint is part of the `input` group. (See the
[python-evdev documentation](https://python-evdev.readthedocs.io/en/latest/usage.html).)


To find the user running octoprint, run:

    sudo ps aux | grep octoprint\\\|USER

To ensure that that user is not currently part of the `input` group, run:

    groups theuserrunningoctoprint

If the user is not part of the `input` group, run:

    sudo usermod -a -G input theuserrunningoctoprint

You will then need to reboot the system to ensure the new group is registered
for running processes/sessions.
