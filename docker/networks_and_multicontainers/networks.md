# Docker Networks
We use docker networks to run multi-container apps, and we want container to be able to communicate with each other.

# Bridge Networks
Software-based network connecting multiple containers on the same host machine.

Containers on same bridge can communicate with each other, containers on diff bridged networks cannot.

## Seeing current docker networks on host machine

    docker network ls

Default output:
    NETWORK ID     NAME      DRIVER    SCOPE
    002982c795da   bridge    bridge    local
    9b9dc9c65f87   host      host      local
    9392c5785d6e   none      null      local

These are the 3 default docker networks:
1. ``bridge`` is the default bridge network. All container connected to this network by default. Allows communication to outsied world as well as between container connected to it.
2. ``host`` is used to connect a container directly to host machine network.
3. ``none`` is used to start a container with no networking.


# Creating a Docker Network

    docker network create --driver bridge test-net

Our network is called ``test-net``, and we are using ``bridge`` driver to create a bridge network. 
We should now see our test-net network when we run ```docker network ls```:

    NETWORK ID     NAME       DRIVER    SCOPE
    002982c795da   bridge     bridge    local
    9b9dc9c65f87   host       host      local
    9392c5785d6e   none       null      local
    3850a7e29b32   test-net   bridge    local


## Get info about our network

    docker network inspect test-net

This gives us info about the network called test-net such as its subnet and gateway IP. JSON (?)



# Multi-Container Example
## Creating multiple container
Creating two different alpine containers, running Ash shell (default to alphine) and attach them to our network using the --network option. 

Container 1:
    docker run -dit --name test1 --network test-net alpine ash

Container 2:
    docker run -dit --name test2 --network test-net alpine ash

    -dit:
        Running detached mode (-d) and interactable from the terminal (-it)

    --name: 
        Name of the container created from the image alpine
    
    --network:
        Attaching container to network called test-net
    
    alpine ash:
        Running image alpine with argument ash


## Attaching Containers
After running the commands we should get one container named test 1 and one called test 2. ``docker network inspect test-net`` should now show the container attached.

Now we will use ``docker container attach`` to attach to the running test 1 container (i.e. bringing it out of detached mode and into the foreground)

    docker container attach test1

This should bring us into a shell in our container in test 1 container. We can show that we can communicate over the network to test 2 container usign the ping command.
NOTE: not using default bridge, rather a custom-made bridge network; this means we can use container names lie hostnames as non-default bridge networks can resolve container names to IP addresses.


## Pinging to communicate with containers

    ping -c 3 test2

This should ping 3 packets to container test2

Possible output:
    PING test2 (172.18.0.3): 56 data bytes
    64 bytes from 172.18.0.3: seq=0 ttl=64 time=5.506 ms
    64 bytes from 172.18.0.3: seq=1 ttl=64 time=0.139 ms
    64 bytes from 172.18.0.3: seq=2 ttl=64 time=0.140 ms 

    --- test2 ping statistics ---
    3 packets transmitted, 3 packets received, 0% packet loss
    round-trip min/avg/max = 0.139/1.928/5.506 ms

``CTRL-P`` or ``CTRL-Q`` can be used to detach from container without stopping it; this will bring us back to terminal on host machine.
NOTE: doesn't work on vs code??
We can then attach to test 2 and perform same test just to verify that we can reach each container from the other.