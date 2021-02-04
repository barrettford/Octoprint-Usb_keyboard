import sys

if sys.platform.startswith("linux"):
  from .keyboard_listener_evdev import KeyboardListenerThread 
else:
  from .keyboard_listener_pynput import KeyboardListenerThread
