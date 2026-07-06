-- NETAce AI — starter syllabus taxonomy (edit freely in Faculty → Syllabus).
-- Modeled on a networking certification curriculum ("NET Ace"); replace with
-- your own exam's units and topics.

insert into public.syllabus_units (code, title, description, order_index) values
  ('U1', 'Networking Fundamentals', 'OSI & TCP/IP models, topologies, cabling, core protocols', 1),
  ('U2', 'IP Addressing & Subnetting', 'IPv4/IPv6 addressing, subnet design, VLSM, NAT', 2),
  ('U3', 'Routing & Switching', 'Routing protocols, VLANs, STP, inter-VLAN routing', 3),
  ('U4', 'Network Services', 'DNS, DHCP, NTP, web/mail services, QoS', 4),
  ('U5', 'Network Security', 'Firewalls, ACLs, VPNs, threats & hardening', 5),
  ('U6', 'Wireless & Emerging Tech', 'WLAN standards, cellular, SDN, cloud networking', 6)
on conflict (code) do nothing;

insert into public.topics (unit_id, title, order_index)
select u.id, t.title, t.ord
from (values
  ('U1', 'OSI Model', 1), ('U1', 'TCP/IP Stack', 2), ('U1', 'Network Topologies', 3),
  ('U1', 'Transmission Media', 4), ('U1', 'Common Protocols & Ports', 5),
  ('U2', 'IPv4 Addressing', 1), ('U2', 'Subnetting & VLSM', 2), ('U2', 'IPv6', 3), ('U2', 'NAT & PAT', 4),
  ('U3', 'Static & Dynamic Routing', 1), ('U3', 'OSPF & EIGRP', 2), ('U3', 'VLANs & Trunking', 3),
  ('U3', 'Spanning Tree Protocol', 4),
  ('U4', 'DNS', 1), ('U4', 'DHCP', 2), ('U4', 'Network Management & Monitoring', 3), ('U4', 'QoS', 4),
  ('U5', 'Firewalls & ACLs', 1), ('U5', 'VPNs & Tunneling', 2), ('U5', 'Threats & Attacks', 3),
  ('U5', 'Device Hardening', 4),
  ('U6', 'Wi-Fi Standards', 1), ('U6', 'Wireless Security', 2), ('U6', 'SDN & Automation', 3),
  ('U6', 'Cloud Networking', 4)
) as t(unit_code, title, ord)
join public.syllabus_units u on u.code = t.unit_code
on conflict (unit_id, title) do nothing;
