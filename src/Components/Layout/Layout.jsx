// import React from "react";
// import { useLocation } from "react-router-dom";
// import Sidebar from "../Sidebar/Sidebar";
// import Header from "../Header/Header";
// import Footer from "../Footer/Footer";

// const Layout = ({ children }) => {
// 	const location = useLocation();

// 	// Check if the current route is the login page
// 	const isLoginPage = location.pathname === "/";
//   const isDashboard = location.pathname === "/dashboard";
//   return (
//      <div className="flex flex-col min-h-screen">
//       <Header />

//       <div className="flex flex-1">
//         {/* {!isLoginPage && <Sidebar />} */}
//         <div className="flex-1 mt-20 bg-gray-50">
//           <main className="p-4">{children}</main>
//         </div>
//       </div>
//  {isDashboard && <Footer />}
      
//     </div>
//   );
// };

// export default Layout;





// import React from "react";
// import { useLocation } from "react-router-dom";
// import Header from "../Header/Header";
// import Footer from "../Footer/Footer";

// const Layout = ({ children }) => {
//   const location = useLocation();

//   // Route-based logic
//   const isLoginPage = location.pathname === "/";
//   const isDashboard = location.pathname === "/dashboard";

//   return (
//     <div className="flex flex-col min-h-screen bg-[#f8fafc]">
//       {/* The Header is 'fixed', so it floats on top of everything */}
//       <Header />

//       <div className="flex flex-1">
//         {/* 
//           IMPORTANT: mt-20 (80px) matches the new Header height perfectly.
//           This ensures your content starts exactly where the header ends.
//         */}
//         <div className="flex-1 mt-20">
//           <main className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto">
//             {children}
//           </main>
//         </div>
//       </div>

//       {/* Show footer only on Dashboard */}
//       {isDashboard && <Footer />}
//     </div>
//   );
// };

// export default Layout;





// import React from "react";
// import Header from "../Header/Header";
// import Footer from "../Footer/Footer";

// const Layout = ({ children }) => {
//   return (
//     <div className="flex flex-col min-h-screen bg-slate-50">
//       <Header />
//       <div className="flex flex-1">
//         <div className="flex-1 mt-20">
//           <main className="p-6 lg:p-10 max-w-[1700px] mx-auto">{children}</main>
//         </div>
//       </div>
//     </div>
//   );
// };
// export default Layout;




import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";

const Layout = ({ children }) => {
  const location = useLocation();

  const isLoginPage = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <div className="flex flex-1">
        <div className="flex-1 mt-20 bg-gray-50">
          <main className="p-4">{children}</main>
        </div>
      </div>
      {isDashboard && <Footer />}
    </div>
  );
};

export default Layout;