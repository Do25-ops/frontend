import React,{useEffect} from 'react';
import axios from 'axios';
import { createBrowserRouter, RouterProvider, Outlet,useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './Pages/LandingPage';
import Login from './Pages/Login';
import Navbar from './Components/Navbar';
import LeaderBoard from './Pages/LeaderBoard';
import QueryPage from './Pages/QueryPage';
import Footer from './Components/Footer';
import Banner from './Components/Banner';
import { useUserContext } from './Contexts/userContext';
import Management from './Pages/Management';
import EndPage from './Components/EndPage';
import ErrorPage from './Components/ErrorPage';

const Layout = () => {
  return (
    <>
      <Navbar />
      <Outlet /> 
      <Footer/>
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />, 
    children: [
      {
        path: "",
        element: <LandingPage />, 
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "leaderboard",
        element: <LeaderBoard/>
      },
      {
        path: "competition",
        element: <QueryPage/>
      },
      {
        path: "upcomingCompetition",
        element: <Banner/>
      },
      {
        path : "manageCompetition",
        element : <Management/>
      },
      {
        path : "end-page",
        element : <EndPage/>
      }
    ],
  },
  // {
  //   path : '/',
  //   children: [
  //     {
  //       path : "end-page",
  //       element : <EndPage/>
  //     }
  //   ]
  // }
]);

const App = () => {
  const { user, setUser } = useUserContext();
  const currentPath = window.location.pathname; 
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/check-session`, { withCredentials: true })
      .then(response => {
        if(response.data.restore){
          setUser(prev => ({
          ...response.data.userData,
          loggedIn: true,
        }));
        }
  
      })
      .catch(err => {
      });
  }, [currentPath]); 

  return (
    <div className="min-h-screen w-full flex flex-col">
      <RouterProvider router={router} />
    </div>
  );
};

export default App;
