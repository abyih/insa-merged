import { Link, useLocation } from "react-router-dom";
// import "./Sidebar.css"; // Optional: Add your own styles

const links = [
	{ title: "Dashboard", link: "/dashboard" },
	{ title: "Nodes", link: "/nodes" },
	{ title: "Topology", link: "/topology" },
	{ title: "Flows", link: "/flows" },
	{ title: "Flow Manager", link: "/flow-manager" },
	{ title: "Path Trace", link: "/path-trace" },
	{ title: "Security Hub", link: "/security" },
	{ title: "↳ Anomaly Detector", link: "/security/anomaly" },
	{ title: "↳ Link Guard", link: "/security/linkguard" },
	{ title: "↳ TLS Encryption", link: "/security/tls" },
	{ title: "Cloud", link: "/cloud" },
	{ title: "ONOS Slicing", link: "/network-slicing" },
	{ title: "Slicing Verification", link: "/slicing-verification" },
	{ title: "OpenStack Slices", link: "/slices" },
	{ title: "VM Topology Map", link: "/vm-topology" },
	{ title: "Stats", link: "/stats" },
	{ title: "Api-Tester", link: "/api-tester" },
	{ title: "Yangman", link: "/yangui" },
];

const Sidebar = () => {
	const location = useLocation();
	return (
		<div className="fixed left-0 top-20 text-lg bg-gray-100 min-w-72 h-full">
			<nav className="py-1">
				<ul className="list-none px-2 flex flex-col gap-2">
					{links.map((link, idx) => {
						return (
							<Link
								to={link.link}
								key={idx}
								className={`${
									location.pathname === link.link &&
									"bg-blue-400 text-white"
								} px-4 py-2 rounded`}
							>
									{link.title}
							</Link>
						);
					})}
				</ul>
				{/* <li>
						<Link to="/nodes">Nodes</Link>
					</li>
					<li>
						<Link to="/topology">Topology</Link>
					</li>
					<li>
						<Link to="/api">ApiTester</Link>
					</li>
					<li>
						<Link to="/yangman">Modules</Link>
					</li>

					<li>
						<Link to="/yangui">Yangman</Link>
					</li> */}
			</nav>
		</div>
	);
};

export default Sidebar;
