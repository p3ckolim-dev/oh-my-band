// MIDI Device Interface
// Handles electronic keyboard connections using Web MIDI API

export class MidiInterface {
  constructor(onNoteOn, onNoteOff, onDevicesChanged) {
    this.onNoteOn = onNoteOn; // callback(midiNote, velocity)
    this.onNoteOff = onNoteOff; // callback(midiNote)
    this.onDevicesChanged = onDevicesChanged; // callback(deviceNamesArray)
    
    this.midiAccess = null;
    this.activeDevices = [];
    this.boundMessageHandler = this.handleMidiMessage.bind(this);
  }

  async requestAccess() {
    if (this.midiAccess) return true;

    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API is not supported in this browser.");
      if (this.onDevicesChanged) {
        this.onDevicesChanged([]);
      }
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      
      // Monitor device connection/disconnection
      this.midiAccess.onstatechange = (e) => {
        this.updateDevicesList();
      };
      
      this.updateDevicesList();
      return true;
    } catch (e) {
      console.error("MIDI access request rejected:", e);
      if (this.onDevicesChanged) {
        this.onDevicesChanged([]);
      }
      return false;
    }
  }

  updateDevicesList() {
    if (!this.midiAccess) return;

    const devices = [];
    const inputs = this.midiAccess.inputs.values();
    
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
      devices.push(input.value);
    }
    
    this.activeDevices = devices;
    const deviceNames = devices.map(d => `${d.name} (${d.manufacturer || "Unknown"})`);
    
    if (this.onDevicesChanged) {
      this.onDevicesChanged(deviceNames);
    }

    // Automatically bind message listeners to all available MIDI inputs
    this.bindListeners();
  }

  bindListeners() {
    this.activeDevices.forEach(device => {
      // Avoid duplicate listeners by resetting first
      device.onmidimessage = null;
      device.onmidimessage = this.boundMessageHandler;
    });
  }

  handleMidiMessage(event) {
    // Parse MIDI message
    // data[0] = Status byte (e.g. 0x90 = Note On, 0x80 = Note Off)
    // data[1] = Note number (0-127)
    // data[2] = Velocity (0-127)
    const [status, note, velocity] = event.data;
    
    // Status types (channel independent check by masking channel nibble)
    const type = status & 0xf0;
    
    if (type === 0x90 && velocity > 0) {
      // Note On
      if (this.onNoteOn) {
        this.onNoteOn(note, velocity);
      }
    } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
      // Note Off
      if (this.onNoteOff) {
        this.onNoteOff(note);
      }
    }
  }

  stop() {
    this.activeDevices.forEach(device => {
      device.onmidimessage = null;
    });
    this.midiAccess = null;
    this.activeDevices = [];
  }
}
