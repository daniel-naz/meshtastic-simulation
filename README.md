# Meshtasticator

### View online [Link](https://daniel-naz.github.io/meshtastic)

Discrete‑event and interactive simulator for Meshtastic.

## Notes

- Seed '0' is empty by default - change it before generating a map.
- While placing walls, press right click to stop.

## Discrete‑event simulator

The discrete‑event simulator mimics the radio section of the device software in order to understand its working. It can also be used to assess the performance of your scenario, or the scalability of the protocol.

See this document for a usage guide.

After a simulation, it plots the placement of nodes and time schedule for each set of overlapping messages that were sent.

It can be used to analyze the network for a set of parameters. For example, these are the results of 100 simulations of 200 s with a different hop limit and number of nodes. As expected, the average number of nodes reached for each generated message increases as the hop limit increases.

However, it comes at the cost of usefulness, i.e., the amount of received packets that contain a new message (not a duplicate due to rebroadcasting) out of all packets received.

## Interactive simulator

The interactive simulator uses the Linux native application of Meshtastic, i.e. the real device software, while simulating some of the hardware interfaces, including the LoRa chip. Can also be used on a Windows or macOS host with Docker.

See this document for a usage guide.

It allows for debugging multiple communicating nodes without having real devices.

Furthermore, since the simulator has an “oracle view” of the network, it allows to visualize the route messages take.

## Original

Part of the source code is based on the work in assignment.1, can be found [here](https://daniel-naz.github.io/meshtastic-sim/).

