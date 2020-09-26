from pynput import keyboard




listener = keyboard.Listener(on_press=on_press,on_release=on_release)


def start():
  listener.start()

def stop():
  listener.stop()