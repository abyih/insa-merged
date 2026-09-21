from mininet.topo import Topo

class SlicingTopo( Topo ):
    def build( self ):
        # 1. Create 8 Switches
        switches = []
        for i in range(1, 9):
            s = self.addSwitch('s%d' % i)
            switches.append(s)

        # 2. Link Switches Linearly (1-2-3-4-5-6-7-8)
        for i in range(7):
            self.addLink(switches[i], switches[i+1])

        # 3. Add Hosts with Custom Subnets
        for i in range(1, 9):
            if i <= 4:
                # Hospital Network (Subnet 1)
                ip = '10.0.1.%d/16' % i
            else:
                # Guest Network (Subnet 2)
                ip = '10.0.2.%d/16' % i
            
            # Explicitly set the MAC address so it syncs with the AI Intent Engine
            mac_addr = '00:00:00:00:00:%02x' % i
            h = self.addHost('h%d' % i, ip=ip, mac=mac_addr)
            
            self.addLink(h, switches[i-1])

topos = { 'slicingtopo': ( lambda: SlicingTopo() ) }