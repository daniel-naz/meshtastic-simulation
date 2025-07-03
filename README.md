# Meshtasticator

### View online [Link](https://daniel-naz.github.io/meshtastic)

Discrete‑event and interactive simulator for Meshtastic.

## Notes

- Seed '0' is empty by default - change it before generating a map.
- While placing walls, press right click to stop.

## Discrete‑event simulator

The discrete‑event simulator mimics the radio section of the device software in order to understand its working. It can also be used to assess the performance of your scenario, or the scalability of the protocol.

After a simulation, it plots the placement of nodes and time schedule for each set of overlapping messages that were sent.

It can be used to analyze the network for a set of parameters. 

## Interactive simulator

The interactive simulator of Meshtastic, i.e. the real device software, while simulating some of the hardware interfaces, including the LoRa chip.

It allows for debugging multiple communicating nodes without having real devices.

Furthermore, since the simulator has a visual of the network, it allows to view the route messages take.

## Original

Part of the source code is based on the work in assignment.1, can be found [here](https://daniel-naz.github.io/meshtastic-sim/).

