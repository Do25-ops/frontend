import axios from "axios";
import { io } from "socket.io-client";
import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();
let socket;

export const UserProvider = ({ children }) => {
    
  const [user, setUser] = useState({teamName: '',email: '',member_count:1,level:1,team_id: 0,loggedIn:false,just_logged_out : false});

  
  // useEffect(() => {
  //   if(user && !socket){
  //     socket = io('https://backend-theta-two-99.vercel.app/', { withCredentials: true });
  //   }
    
  //   return ()=>{
  //     socket.disconnect();
  //     socket = null;
  //   }
     
  // },[]);
  const logUserOut = async () => {
    try {
      await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/logout`, { withCredentials: true });
      
      setUser({teamName: '',email: '',member_count:1,level:1,loggedIn:false,just_logged_out:true});

    } catch (err) {
      alert('Error logging out: ' + err.message);
    }
  };

  const logUserIn = async (formData) => {
    
    try{
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/login`,JSON.stringify(formData),{headers:{ "Content-Type":"application/json"}, withCredentials:true})
      setUser((prev) => ({
          ...response.data,
          loggedIn:true
      }));
    }
    catch(err){
        alert(err.message)
    }
  }
  
  const registerUser = async (formData) => {
    try{
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/register`,JSON.stringify(formData), { headers : { "Content-Type": "application/json"}});
      alert('Registeration successful, please log in ' + formData.username);
    }
    catch(err){
      alert(err.message);

    }
  }

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      logUserIn, 
      registerUser,
      logUserOut,
      socket
     }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
      throw new Error("useUserContext must be used within a UserProvider");
    }  
    return context;
  };
  
