import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  FiUpload,
  FiMap,
  FiCode,
  FiCheck,
  FiDownload,
  FiUnlock,
  FiBookOpen,
  FiChevronDown,
  FiPlay,
  FiX
} from "react-icons/fi";
import { useUserContext } from "../Contexts/userContext";
import { useNavigate } from "react-router-dom";
import SubmissionWindow from "../Components/SubmissionWindow";
import Demo from "../Components/Demo";
import CompletionPopup from "../Components/CompletionPopup";


const OraclePopup = ({ message, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg w-96 z-50">
      <div className="flex justify-between items-start">
        <pre className="text-white text-sm whitespace-pre-wrap">{message}</pre>
        <button onClick={onClose} className="ml-4 text-red-400 hover:text-white">
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
};


const QueryPage = () => {
  const [isLoading,setLoading] = useState(true);
  const [selectedDialect, setSelectedDialect] = useState("mysql");
  const [queryAccepted,setAccepted] = useState(false);
  const [competitionDetails, setCompetitionDetails] = useState({
          competitionName: "",
          competitionDate: "",
          startTime: "",
          endTime: ""
  });
  const [selectedQuery, setSelectedQuery] = useState([]);
  const [userAnswer, setUserAnswer] = useState("");
  const { user, socket, setUser,logUserOut } = useUserContext();
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [showSubmissionWindow, setShowSubmissionWindow] = useState(false);
  const [showDemo, setDemo] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);
  const [canSubmit,setCanSubmit] = useState(true);
    const [showPopup, setShowPopup] = useState(false); 
  
  useEffect(() => {
    const fetchTimings = async () => {
       try{
          const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/getCompetitionTimings`);

          setCompetitionDetails(response.data);
       }   
       catch(err){

       }
    }
    fetchTimings()
},[]);


useEffect(() => {
  if (!competitionDetails.endTime || !competitionDetails.competitionDate) return;

  const checkTime = () => {
      const now = new Date();
      const competitionEnd = new Date(`${competitionDetails.competitionDate}T${competitionDetails.endTime}`);

      if (now >= competitionEnd) {
        if(user.loggedIn) logUserOut();
          navigate("/end-page"); 
      }
  };

  checkTime(); 
  const interval = setInterval(checkTime, 1000 * 60); 

  return () => clearInterval(interval);
}, [competitionDetails, navigate]);

  useEffect(() => {
    if (selectedDialect === "oracle") {
setMessage(`Since you're using Oracle, please avoid placing a semicolon (;) at the end of your queries if it is a single query like INSERT or SELECT.

Additionally, you won’t be able to view the output — you’ll need to submit your query. 
However, you can still test run your query to check for any errors.

To view the data, you can run SELECT queries in other dialects.
${user.level >= 4? `
Kindly note the differences in schema for Oracle:
          1. In the Solution table, the fields are: crime_user, value
          2. In the crime_scene_report table, use 'crime_date' for the date column
          3. In the facebook_event_checkin table, use 'check_in_date' for the date column
        ` : ""
    }`);
        
    } else setMessage(null);
  }, [selectedDialect]);
  
  
 

  useEffect(() => {
    if (user) setDemo(user.firstLogin);
  }, []);
  

 
  const levelChanger = (email,new_level) => {
    console.log('Changing levell? ',email ,' ',new_level);
    if (email == user.email && new_level <=8) {
      setUser((prev) => ({ ...prev, level: new_level }));
      zoomToLevel(2.5, levels[new_level - 1].x, levels[new_level - 1].y);
      fetchQueries();
    }else {
      setShowPopup(true);
   }
  };

  const fetchLevel = async() =>{
    try{
       const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/fetchTeamLevel/${user.team_id}`
        ,{
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
       );
       if(response.data[0].level !== user.level){
        console.log('changin level to ',response.data[0].level);
          levelChanger(user.email,response.data[0].level);
       } 
    }
    catch(err){
        
    }
  }
  

  const fetchQueries = async (e) => {
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/queries/${user.level}.${user.team_id}`, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      })
      .then((res) => {
        setQueries(res.data.queries);
        console.log('Query responses' ,res.data.queries);
        //  setSelectedQuery(res.data.queries[0]);
      })
      .catch((err) => {
      });
  };
  
  function parseTableString(tableString) {
    if (!tableString) {
      return [];
    }

    const lines = tableString
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let result = [];
    let headers = [];

    if (selectedDialect === "postgresql") {
      const filteredLines = lines
        .filter((line) => !/^(CREATE TABLE|INSERT \d+ \d+)$/.test(line))
        .filter((line) => !/^\(\d+ rows?\)$/.test(line));
      if (filteredLines.length < 2) {
        throw new Error("Invalid PostgreSQL table format");
      }
      headers = filteredLines[0]
        .split("|")
        .map((cell) => cell.trim().toLowerCase());
      const dataStartIndex = 2;
      for (let i = dataStartIndex; i < filteredLines.length; i++) {
        let cells = filteredLines[i].split("|").map((cell) => cell.trim());
        if (cells.length === headers.length) {
          result.push(
            Object.fromEntries(headers.map((h, idx) => [h, cells[idx]]))
          );
        } else if (result.length > 0) {
          result[result.length - 1][headers[headers.length - 1]] +=
            " " + filteredLines[i].trim();
        }
      }
    } else if (selectedDialect === "mysql") {
      const headerLine = lines.find(
        (line) => line.startsWith("|") && !line.startsWith("+-")
      );
      if (!headerLine) {
        throw new Error("No header line found");
      }
      headers = headerLine
        .split("|")
        .filter((cell) => cell.trim().length > 0)
        .map((cell) => cell.trim().toLowerCase());
      const dataStartIndex = lines.indexOf(headerLine) + 1;
      for (let i = dataStartIndex; i < lines.length; i++) {
        let line = lines[i];
        if (line.startsWith("+-")) continue;
        if (line.startsWith("|")) {
          let cells = line
            .split("|")
            .filter((cell) => cell.length > 0)
            .map((cell) => cell.trim());
          if (cells.length === headers.length) {
            result.push(
              Object.fromEntries(headers.map((h, idx) => [h, cells[idx]]))
            );
          } else if (result.length > 0) {
            result[result.length - 1][headers[headers.length - 1]] +=
              " " + line.trim();
          }
        }
      }
    } else if (selectedDialect === "oracle") {
      if (lines.some((line) => line.includes("|"))) {
        let isHeaderDone = false;
        let dataStartIndex = 0;

        // Step 1: Extract headers dynamically
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];

          // Stop at the first separator (----|----)
          if (/^[-+\s]+\|[-+\s]+$/.test(line)) {
            isHeaderDone = true;
            dataStartIndex = i + 1; // Data starts after this
            break;
          }

          // Extract headers (first two via '|', rest dynamically)
          if (line.includes("|")) {
            headers.push(
              ...line
                .split("|")
                .map((h) => h.trim())
                .filter((h) => h.length > 0)
            );
          } else {
            headers.push(line.trim());
          }
        }

        // Step 2: Parse data rows
        for (let i = dataStartIndex; i < lines.length; i++) {
          let line = lines[i];

          // Skip empty or separator lines
          if (/^[-+\s]+$/.test(line)) continue;

          let cells = line
            .split("|")
            .map((c) => c.trim())
            .filter((c) => c.length > 0);

          if (cells.length >= 2) {
            let row = {};

            // First N fields (before multi-line text)
            let firstFieldsCount = 2; // Assume first 2 fields are separated by '|'
            for (let j = 0; j < firstFieldsCount; j++) {
              row[headers[j]] = cells[j];
            }

            // Handle multi-line fields (dynamically detect middle fields)
            let multiLineFields = [];
            let multiLineStartIndex = result.length;

            while (i + 1 < lines.length && !lines[i + 1].includes("|")) {
              i++;
              multiLineFields.push(lines[i].trim());
            }

            // Assign dynamic middle fields
            let middleHeaders = headers.slice(
              firstFieldsCount,
              headers.length - 2
            );
            for (let j = 0; j < middleHeaders.length; j++) {
              row[middleHeaders[j]] = multiLineFields[j] || "";
            }

            // Last M fields (after text fields)
            if (i + 1 < lines.length && lines[i + 1].includes("|")) {
              i++;
              let lastFields = lines[i]
                .split("|")
                .map((c) => c.trim())
                .filter((c) => c.length > 0);
              let lastHeaders = headers.slice(-lastFields.length);
              for (let j = 0; j < lastFields.length; j++) {
                row[lastHeaders[j]] = lastFields[j];
              }
            }

            result.push(row);
          }
        }
      } else {
        const cleanedLines = lines
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        let currentRow = [];
        let lastDashIndex = -1;

        for (let i = 0; i < cleanedLines.length; i++) {
          if (/^[-]+$/.test(cleanedLines[i])) {
            lastDashIndex = i;
          }
        }

        for (let i = 0; i < lastDashIndex; i += 2) {
          headers.push(cleanedLines[i].toLowerCase());
        }

        let headerCount = headers.length;

        for (let i = lastDashIndex + 1; i < cleanedLines.length; i++) {
          currentRow.push(cleanedLines[i]);

          if (currentRow.length === headerCount) {
            result.push(
              Object.fromEntries(headers.map((h, idx) => [h, currentRow[idx]]))
            );
            currentRow = [];
          }
        }
      }
    }

    return result;
  }
  const VITE_MURDER_DB_MYSQL="CREATE TABLE crime_scene_report (date INT,type VARCHAR(50),description VARCHAR(255),city VARCHAR(100)); INSERT INTO crime_scene_report (date,type,description,city) VALUES(20180115, 'assault', 'Hamilton: Lee, do you yield? Burr: You shot him in the side! Yes he yields!', 'SQL City'),(20180115, 'assault', 'Report Not Found', 'SQL City'),(20180115, 'murder', 'Security footage shows that there were 2 witnesses. The first witness lives at the last house on Northwestern Dr. The second witness, named Annabel, lives somewhere on Franklin Ave.', 'SQL City'),(20171229, 'fraud', 'Why, said the Gryphon, you first form into a line along the', 'Antioch'),(20171229, 'fraud', 'Why, said the Gryphon, you first form into a line along the', 'Spokane'),(20171229, 'robbery', 'Serpent, I say again! repeated the Pigeon, but in a more subdued tone', 'West Covina'),(20171231, 'murder', 'short remarks, and she drew herself up and said, very gravely, I think', 'Glendale'),(20171231, 'theft', 'get is the same thing as I get what I like!', 'Huntington Beach'),(20171231, 'fraud', 'The door led right into a large kitchen, which was full of smoke from', 'Honolulu'),(20171231, 'blackmail', 'You are, said the King.', 'Yonkers'),(20171231, 'blackmail', 'The bullies are always blackmailing others', 'Pomona'),(20180101, 'blackmail', 'the worst situation i could have been in!', 'Frederick');CREATE TABLE drivers_license (id integer PRIMARY KEY,age integer,height integer,eye_color VARCHAR(100),hair_color VARCHAR(100),gender VARCHAR(100),plate_number VARCHAR(100),car_make VARCHAR(100),car_model VARCHAR(100));INSERT INTO drivers_license VALUES(118009,64,84,'blue','white','male','00NU00','Mercedes-Benz','E-Class');INSERT INTO drivers_license VALUES(490173,35,65,'green','brown','female','23AM98','Toyota','Yaris');INSERT INTO drivers_license VALUES(903934,29,65,'black','green','female','O5W55E','Pontiac','Firebird');INSERT INTO drivers_license VALUES(938869,57,61,'blue','red','male','6K2P7B','Volvo','S60');INSERT INTO drivers_license VALUES(690583,48,63,'black','blonde','male','NS5LP6','Mazda','Mazda3');INSERT INTO drivers_license VALUES(985615,39,77,'blue','brown','female','0WI7SG','Scion','xD');INSERT INTO drivers_license VALUES(675018,89,62,'brown','black','female','24CFT4','Isuzu','Axiom');CREATE TABLE person (id integer PRIMARY KEY, name VARCHAR(100), license_id integer, address_number integer, address_street_name VARCHAR(200), FOREIGN KEY (license_id) REFERENCES drivers_license (id));INSERT INTO person VALUES(14887,'Morty Schapiro',118009,4919,'Northwestern Dr');INSERT INTO person VALUES(14821,'Eda Snover',903934,1075,'Idalyn St');INSERT INTO person VALUES(14824,'Tobias Tow',938869,2753,'Lou Courtney St');INSERT INTO person VALUES(14827,'Marlin Hillwig',690583,3106,'Pagum Ave');INSERT INTO person VALUES(14849,'Fay Marsden',985615,580,'Deepdene Park Dr');INSERT INTO person VALUES(16371,'Annabel Miller',490173,103,'Franklin Ave');INSERT INTO person VALUES(14880,'Sena Muschick',675018,1841,'Bulkeley Rd');CREATE TABLE interview (person_id integer,transcript VARCHAR(500),FOREIGN KEY (person_id) REFERENCES person(id));INSERT INTO interview VALUES(16371,'I saw the murder happen, and I recognized the killer from my gym when I was working out last week on January the 9th.');INSERT INTO interview VALUES(14887,'I heard a gunshot and then saw a man run out. He had a \"Get Fit Now Gym\" bag. The membership number on the bag started with \"48Z\". Only gold members have those bags. The man got into a car with a plate that included \"H42W\".');CREATE TABLE get_fit_now_member (id VARCHAR(100) PRIMARY KEY,person_id integer,name VARCHAR(100),membership_start_date integer,membership_status VARCHAR(100),FOREIGN KEY (person_id) REFERENCES person(id));CREATE TABLE get_fit_now_check_in (membership_id VARCHAR(100),check_in_date integer,check_in_time integer,check_out_time integer,FOREIGN KEY (membership_id) REFERENCES get_fit_now_member(id));INSERT INTO drivers_license VALUES(108978,70,56,'brown','grey','female','OR1UPR','Volkswagen','Rabbit');INSERT INTO person VALUES(15247,'Shondra Ledlow',108978,2906,'Chuck Dr');INSERT INTO get_fit_now_member VALUES('X0643',15247,'Shondra Ledlow',20170521,'silver');INSERT INTO get_fit_now_check_in VALUES('X0643',20180109,957,1164);INSERT INTO drivers_license VALUES(402017,45,81,'black','blonde','male','8MCH5R','BMW','M5');INSERT INTO person VALUES(28073,'Zackary Cabotage',402017,3823,'S Winthrop Ave');INSERT INTO get_fit_now_member VALUES('UK1F2',28073,'Zackary Cabotage',20170818,'silver');INSERT INTO get_fit_now_check_in VALUES('UK1F2',20180109,344,518);INSERT INTO drivers_license VALUES(556026,44,58,'amber','red','female','7F7U6O','Chrysler','Pacifica');INSERT INTO person VALUES(55662,'Sarita Bartosh',556026,1031,'Legacy Pointe Blvd');INSERT INTO get_fit_now_member VALUES('XTE42',55662,'Sarita Bartosh',20170524,'gold');INSERT INTO get_fit_now_check_in VALUES('XTE42',20180109,486,1124);INSERT INTO drivers_license VALUES(952073,51,59,'amber','grey','female','KPF728','Lincoln','Aviator');INSERT INTO person VALUES(10815,'Adriane Pelligra',952073,948,'Emba Ave');INSERT INTO get_fit_now_member VALUES('1AE2H',10815,'Adriane Pelligra',20170816,'silver');INSERT INTO get_fit_now_check_in VALUES('1AE2H',20180109,461,944);INSERT INTO drivers_license VALUES(915564,33,62,'green','black','male','58G5JT','Smart','Fortwo');INSERT INTO person VALUES(83186,'Burton Grippe',915564,484,'Lemcrow Way');INSERT INTO get_fit_now_member VALUES('6LSTG',83186,'Burton Grippe',20170214,'gold');INSERT INTO get_fit_now_check_in VALUES('6LSTG',20180109,399,515);INSERT INTO drivers_license VALUES(737886,33,72,'brown','white','female','0ZC1ZV','Lincoln','Navigator L');INSERT INTO person VALUES(31523,'Blossom Crescenzo',737886,1245,'Ruxshire St');INSERT INTO get_fit_now_member VALUES('7MWHJ',31523,'Blossom Crescenzo',20180309,'regular');INSERT INTO get_fit_now_check_in VALUES('7MWHJ',20180109,273,885);INSERT INTO drivers_license VALUES(890722,60,61,'green','brown','female','SVGR5N','Audi','TT');INSERT INTO person VALUES(92736,'Carmen Dimick',890722,2965,'Kilmaine Circle');INSERT INTO get_fit_now_member VALUES('GE5Q8',92736,'Carmen Dimick',20170618,'gold');INSERT INTO get_fit_now_check_in VALUES('GE5Q8',20180109,367,959);INSERT INTO drivers_license VALUES(423327,30,70,'brown','brown','male','0H42W2','Chevrolet','Spark LS');INSERT INTO person VALUES(67318,'Jeremy Bowers',423327,530,'Washington Pl, Apt 3A');INSERT INTO get_fit_now_member VALUES('48Z55',67318,'Jeremy Bowers',20160101,'gold');INSERT INTO get_fit_now_check_in VALUES('48Z55',20180109,1530,1700);INSERT INTO get_fit_now_member VALUES('90081',16371,'Annabel Miller',20160208,'gold');INSERT INTO get_fit_now_check_in VALUES('90081',20180109,1600,1700);CREATE TABLE facebook_event_checkin (person_id integer,event_id integer,event_name VARCHAR(200),date integer,FOREIGN KEY (person_id) REFERENCES person(id));INSERT INTO drivers_license VALUES(101191,64,84,'blue','white','male','00NU00','Mercedes-Benz','E-Class');INSERT INTO person VALUES(24556,'Bryan Pardo',101191,703,'Machine Ln');INSERT INTO facebook_event_checkin VALUES(24556,1143,'SQL Symphony Concert',20171207);INSERT INTO facebook_event_checkin VALUES(24556,1143,'SQL Symphony Concert',20171221);INSERT INTO facebook_event_checkin VALUES(24556,1143,'SQL Symphony Concert',20171224);INSERT INTO drivers_license VALUES(202298,68,66,'green','red','female','500123','Tesla','Model S');INSERT INTO person VALUES(99716,'Miranda Priestly',202298,1883,'Golden Ave');INSERT INTO facebook_event_checkin VALUES(99716,1143,'SQL Symphony Concert',20171206);INSERT INTO facebook_event_checkin VALUES(99716,1143,'SQL Symphony Concert',20171212);INSERT INTO facebook_event_checkin VALUES(99716,1143,'SQL Symphony Concert',20171229);INSERT INTO interview VALUES(67318,'I was hired by a woman with a lot of money. I am not sure what her name is but I know she is around 5ft 5inch (65 cm) or 5ft 7inch (67cm). She has red hair and she drives a Tesla Model S.I know that she attended the SQL Symphony Concert 3 times in December 2017.');CREATE TABLE solution (user integer,value VARCHAR(100));"
  const VITE_ECOMMERCE_DB_MYSQL="CREATE TABLE customers (customer_id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(100) UNIQUE NOT NULL,phone VARCHAR(15),address VARCHAR(100));INSERT INTO customers (name, email, phone, address) VALUES('John Doe', 'johndoe@gmail.com', '1234567890', '123 Street, City'),('Jane Smith', 'janesmith@gmail.com', '0987654321', '456 Avenue, City'),('Alice Johnson', 'alicej@gmail.com', '1112223333', '789 Boulevard, City'),('Bob Brown', 'bobb@gmail.com', '4445556666', '321 Lane, City'),('Charlie Davis', 'charlied@gmail.com', '7778889999', '654 Road, City'),('David Miller', 'davidm@gmail.com', '1231231234', '987 Square, Town'),('Emma Wilson', 'emmaw@gmail.com', '5556667777', '741 Drive, Suburb'),('Frank Harris', 'frankh@gmail.com', '8889990000', '852 Plaza, Metro'),('Grace Lee', 'gracel@gmail.com', '3334445555', '369 Court, Village'),('Henry Adams', 'henrya@gmail.com', '6667778888', '159 Lane, Downtown'),('Ivy Carter', 'ivyc@gmail.com', '2223334444', '753 Park, Uptown'),('Jack Evans', 'jacke@gmail.com', '9998887777', '951 Highway, City'),('Kelly Baker', 'kellyb@gmail.com', '1110009999', '468 Way, District'),('Liam Turner', 'liamt@gmail.com', '7776665555', '357 Path, Riverside'),('Mia Martin', 'miam@gmail.com', '6665554444', '852 Walk, Harbor'),('Nathan Scott', 'nathans@gmail.com', '4443332222', '741 Route, County'),('Olivia White', 'oliviaw@gmail.com', '9990001111', '963 Alley, Province'),('Paul Thomas', 'pault@gmail.com', '8887776666', '258 Cross, Landmark'),('Quinn Hall', 'quinnh@gmail.com', '3332221111', '147 Crescent, Seaside'),('Ryan Clark', 'ryanc@gmail.com', '5554443333', '654 Road, Town'),('Sophia Lewis', 'sophial@gmail.com', '2221110000', '369 Circle, Suburb');CREATE TABLE sellers (seller_id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(100) UNIQUE NOT NULL,phone VARCHAR(15),address VARCHAR(100));INSERT INTO sellers (name, email, phone, address) VALUES('Tech Store', 'techstore@gmail.com', '1122334455', '789 Tech Road, City'),('Zara','zaraclothing@gmail.com','1224334458','123 New York City'),('Fashion Hub', 'fashionhub@gmail.com', '5566778899', '321 Fashion Street, City'),('Home Essentials', 'homeessentials@gmail.com', '9988776655', '147 Home Avenue, City'),('Gaming World', 'gamingworld@gmail.com', '2233445566', '258 Gamer Street, City');CREATE TABLE products (product_id INT AUTO_INCREMENT PRIMARY KEY,seller_id INT,name VARCHAR(150) NOT NULL,description VARCHAR(100),price DECIMAL(10,2) NOT NULL,stock_quantity INT NOT NULL);INSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES(1, 'Laptop', 'High-performance laptop', 1200.99, 10),(1, 'Smartphone', 'Latest model smartphone', 799.49, 15),(2, 'Pants', 'Casual Pants', 19.99, 50),(2, 'Pull overs', 'Winter pull overs', 29.99, 50),(3, 'T-shirt', 'Cotton T-shirt', 19.99, 50),(3, 'Jeans', 'Denim jeans', 39.99, 30),(4, 'Coffee Maker', 'Automatic coffee maker', 89.99, 20),(4, 'Vacuum Cleaner', 'Cordless vacuum cleaner', 129.99, 15),(5, 'Gaming Console', 'Next-gen gaming console', 499.99, 8),(6, 'Gaming Chair', 'Ergonomic gaming chair', 199.99, 12),(6, 'Lighting Keyboard', 'The best keyboard in town', 199.99, 22),(2, 'Shoes', 'Air forces', 299.99, 18); CREATE TABLE orders (order_id INT AUTO_INCREMENT PRIMARY KEY,customer_id INT,seller_id INT,order_date TIMESTAMP,status ENUM('Pending', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',total_amount DECIMAL(10,2) NOT NULL,FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE,FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE);INSERT INTO orders (customer_id,seller_id, order_date, status, total_amount) VALUES(1,1,'2025-02-01 10:30:00', 'Shipped', 1219.98),(2,2, '2025-02-02 15:45:00', 'Pending', 799.49),(3,2, '2025-02-03 12:15:00', 'Delivered', 169.98),(4,3, '2025-02-04 08:00:00', 'Cancelled', 499.99),(5,4, '2025-02-05 17:20:00', 'Pending', 329.98),(6,5, '2024-02-06 13:30:00', 'Shipped', 599.00),(7,1, '2024-02-07 09:10:00', 'Delivered', 749.99),(8,1, '2024-02-08 14:55:00', 'Cancelled', 279.99),(9,1, '2024-02-09 11:45:00', 'Shipped', 459.00),(10,2, '2024-02-10 16:25:00', 'Pending', 899.49),(11,2, '2024-02-11 10:00:00', 'Delivered', 110.99),(12,2, '2024-02-12 13:40:00', 'Shipped', 689.99),(1,3,'2024-02-13 07:25:00', 'Pending', 214.50),(2,3, '2024-02-14 18:10:00', 'Delivered', 555.75),(3,3, '2024-02-15 12:35:00', 'Cancelled', 799.25),(4,4, '2024-02-16 09:50:00', 'Shipped', 923.99),(5,5, '2024-02-17 15:15:00', 'Pending', 305.00),(6,3, '2024-02-18 14:20:00', 'Delivered', 488.40),(7,4, '2024-02-19 16:45:00', 'Shipped', 712.30),(8,1, '2024-02-20 08:55:00', 'Cancelled', 289.99),(9,1, '2024-02-21 14:05:00', 'Pending', 920.10),(10,2, '2024-02-22 12:10:00', 'Delivered', 470.75),(11,2, '2024-02-23 10:20:00', 'Shipped', 600.00),(12,3,'2024-02-24 15:00:00', 'Pending', 150.50),(13,2, '2024-02-25 17:30:00', 'Delivered', 899.99),(14,4,'2024-02-26 09:40:00', 'Cancelled', 120.00),(15,4, '2024-02-27 11:25:00', 'Shipped', 520.99),(16,1, '2024-02-28 14:15:00', 'Pending', 740.60),(17,1,'2024-02-29 08:10:00', 'Delivered', 315.75),(18,1,'2024-03-01 12:55:00', 'Shipped', 690.20),(1,2, '2024-03-02 10:45:00', 'Delivered', 149.99),(2,1, '2024-03-03 16:35:00', 'Pending', 299.50),(3,3, '2024-03-04 07:20:00', 'Shipped', 400.75),(4,2, '2024-03-05 12:50:00', 'Cancelled', 225.99),(5,1, '2024-03-06 18:05:00', 'Shipped', 899.00),(6,2, '2024-03-07 14:20:00', 'Delivered', 420.40); CREATE TABLE ordered_items (order_id INT,product_id INT,quantity INT NOT NULL,FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE ,primary key(order_id,product_id));INSERT INTO ordered_items (order_id, product_id, quantity) VALUES (1, 1, 2), (1, 3, 1), (2, 5, 4), (2, 2, 2), (3, 7, 3), (3, 8, 1), (4, 4, 5), (5, 6, 2), (6, 9, 3), (6, 10, 4), (7, 1, 1), (7, 5, 2), (8, 3, 3), (9, 2, 1), (9, 8, 5), (10, 4, 2), (11, 7, 4), (12, 6, 3), (12, 10, 1), (13, 9, 2), (14, 1, 5), (14, 3, 4), (15, 5, 3), (16, 2, 2), (17, 8, 1), (18, 4, 3), (19, 7, 2), (20, 6, 5), (21, 9, 1), (22, 10, 2), (23, 1, 3), (24, 5, 2), (24, 3, 4), (25, 2, 5), (26, 8, 1), (27, 4, 3), (28, 7, 2), (29, 6, 4), (30, 9, 5), (30, 10, 3), (31, 1, 1), (31, 3, 2), (32, 5, 4), (33, 2, 3), (34, 8, 5), (35, 4, 1), (36, 7, 2), (36, 10, 4);"
  const VITE_MURDER_DB_ORACLE="CREATE TABLE crime_scene_report (crime_date NUMBER, type VARCHAR2(50), description VARCHAR2(255), city VARCHAR2(100));\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20180115, 'assault', 'Hamilton: Lee, do you yield? Burr: You shot him in the side! Yes he yields!', 'SQL City');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20180115, 'assault', 'Report Not Found', 'SQL City');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20180115, 'murder', 'Security footage shows that there were 2 witnesses. The first witness lives at the last house on Northwestern Dr. The second witness, named Annabel, lives somewhere on Franklin Ave.', 'SQL City');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20171229, 'fraud', 'Why, said the Gryphon, you first form into a line along the', 'Antioch');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20171229, 'fraud', 'Why, said the Gryphon, you first form into a line along the', 'Spokane');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20171229, 'robbery', 'Serpent, I say again! repeated the Pigeon, but in a more subdued tone', 'West Covina');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20171231, 'murder', 'short remarks, and she drew herself up and said, very gravely, I think', 'Glendale');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20171231, 'theft', 'get is the same thing as I get what I like!', 'Huntington Beach');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20171231, 'fraud', 'The door led right into a large kitchen, which was full of smoke from', 'Honolulu');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20171231, 'blackmail', 'You are, said the King.', 'Yonkers');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20171231, 'blackmail', 'The bullies are always blackmailing others', 'Pomona');\nINSERT INTO crime_scene_report (crime_date, type, description, city) VALUES (20180101, 'blackmail', 'the worst situation i could have been in!', 'Frederick');\nCREATE TABLE drivers_license (id NUMBER PRIMARY KEY, age NUMBER, height NUMBER, eye_color VARCHAR2(100), hair_color VARCHAR2(100), gender VARCHAR2(100), plate_number VARCHAR2(100), car_make VARCHAR2(100), car_model VARCHAR2(100));\nINSERT INTO drivers_license VALUES (118009, 64, 84, 'blue', 'white', 'male', '00NU00', 'Mercedes-Benz', 'E-Class');\nINSERT INTO drivers_license VALUES (490173, 35, 65, 'green', 'brown', 'female', '23AM98', 'Toyota', 'Yaris');\nINSERT INTO drivers_license VALUES (903934, 29, 65, 'black', 'green', 'female', 'O5W55E', 'Pontiac', 'Firebird');\nINSERT INTO drivers_license VALUES (938869, 57, 61, 'blue', 'red', 'male', '6K2P7B', 'Volvo', 'S60');\nINSERT INTO drivers_license VALUES (690583, 48, 63, 'black', 'blonde', 'male', 'NS5LP6', 'Mazda', 'Mazda3');\nINSERT INTO drivers_license VALUES (985615, 39, 77, 'blue', 'brown', 'female', '0WI7SG', 'Scion', 'xD');\nINSERT INTO drivers_license VALUES (675018, 89, 62, 'brown', 'black', 'female', '24CFT4', 'Isuzu', 'Axiom');\nCREATE TABLE person (id NUMBER PRIMARY KEY, name VARCHAR2(100), license_id NUMBER, address_number NUMBER, address_street_name VARCHAR2(200), FOREIGN KEY (license_id) REFERENCES drivers_license(id));\nINSERT INTO person VALUES (14887, 'Morty Schapiro', 118009, 4919, 'Northwestern Dr');\nINSERT INTO person VALUES (14821, 'Eda Snover', 903934, 1075, 'Idalyn St');\nINSERT INTO person VALUES (14824, 'Tobias Tow', 938869, 2753, 'Lou Courtney St');\nINSERT INTO person VALUES (14827, 'Marlin Hillwig', 690583, 3106, 'Pagum Ave');\nINSERT INTO person VALUES (14849, 'Fay Marsden', 985615, 580, 'Deepdene Park Dr');\nINSERT INTO person VALUES (16371, 'Annabel Miller', 490173, 103, 'Franklin Ave');\nINSERT INTO person VALUES (14880, 'Sena Muschick', 675018, 1841, 'Bulkeley Rd');\nCREATE TABLE interview (person_id NUMBER, transcript VARCHAR2(500), FOREIGN KEY (person_id) REFERENCES person(id));\nINSERT INTO interview VALUES (16371, 'I saw the murder happen, and I recognized the killer from my gym when I was working out last week on January the 9th.');\nINSERT INTO interview VALUES (14887, 'I heard a gunshot and then saw a man run out. He had a \"Get Fit Now Gym\" bag. The membership number on the bag started with \"48Z\". Only gold members have those bags. The man got into a car with a plate that included \"H42W\".');\nCREATE TABLE get_fit_now_member (id VARCHAR2(100) PRIMARY KEY, person_id NUMBER, name VARCHAR2(100), membership_start_date NUMBER, membership_status VARCHAR2(100), FOREIGN KEY (person_id) REFERENCES person(id));\nCREATE TABLE get_fit_now_check_in (membership_id VARCHAR2(100), check_in_date NUMBER, check_in_time NUMBER, check_out_time NUMBER, FOREIGN KEY (membership_id) REFERENCES get_fit_now_member(id));\nINSERT INTO drivers_license VALUES (108978, 70, 56, 'brown', 'grey', 'female', 'OR1UPR', 'Volkswagen', 'Rabbit');\nINSERT INTO person VALUES (15247, 'Shondra Ledlow', 108978, 2906, 'Chuck Dr');\nINSERT INTO get_fit_now_member VALUES ('X0643', 15247, 'Shondra Ledlow', 20170521, 'silver');\nINSERT INTO get_fit_now_check_in VALUES ('X0643', 20180109, 957, 1164);\nINSERT INTO drivers_license VALUES (402017, 45, 81, 'black', 'blonde', 'male', '8MCH5R', 'BMW', 'M5');\nINSERT INTO person VALUES (28073, 'Zackary Cabotage', 402017, 3823, 'S Winthrop Ave');\nINSERT INTO get_fit_now_member VALUES ('UK1F2', 28073, 'Zackary Cabotage', 20170818, 'silver');\nINSERT INTO get_fit_now_check_in VALUES ('UK1F2', 20180109, 344, 518);\nINSERT INTO drivers_license VALUES (556026, 44, 58, 'amber', 'red', 'female', '7F7U6O', 'Chrysler', 'Pacifica');\nINSERT INTO person VALUES (55662, 'Sarita Bartosh', 556026, 1031, 'Legacy Pointe Blvd');\nINSERT INTO get_fit_now_member VALUES ('XTE42', 55662, 'Sarita Bartosh', 20170524, 'gold');\nINSERT INTO get_fit_now_check_in VALUES ('XTE42', 20180109, 486, 1124);\nINSERT INTO drivers_license VALUES (952073, 51, 59, 'amber', 'grey', 'female', 'KPF728', 'Lincoln', 'Aviator');\nINSERT INTO person VALUES (10815, 'Adriane Pelligra', 952073, 948, 'Emba Ave');\nINSERT INTO get_fit_now_member VALUES ('1AE2H', 10815, 'Adriane Pelligra', 20170816, 'silver');\nINSERT INTO get_fit_now_check_in VALUES ('1AE2H', 20180109, 461, 944);\nINSERT INTO drivers_license VALUES (915564, 33, 62, 'green', 'black', 'male', '58G5JT', 'Smart', 'Fortwo');\nINSERT INTO person VALUES (83186, 'Burton Grippe', 915564, 484, 'Lemcrow Way');\nINSERT INTO get_fit_now_member VALUES ('6LSTG', 83186, 'Burton Grippe', 20170214, 'gold');\nINSERT INTO get_fit_now_check_in VALUES ('6LSTG', 20180109, 399, 515);\nINSERT INTO drivers_license VALUES (737886, 33, 72, 'brown', 'white', 'female', '0ZC1ZV', 'Lincoln', 'Navigator L');\nINSERT INTO person VALUES (31523, 'Blossom Crescenzo', 737886, 1245, 'Ruxshire St');\nINSERT INTO get_fit_now_member VALUES ('7MWHJ', 31523, 'Blossom Crescenzo', 20180309, 'regular');\nINSERT INTO get_fit_now_check_in VALUES ('7MWHJ', 20180109, 273, 885);\nINSERT INTO drivers_license VALUES (890722, 60, 61, 'green', 'brown', 'female', 'SVGR5N', 'Audi', 'TT');\nINSERT INTO person VALUES (92736, 'Carmen Dimick', 890722, 2965, 'Kilmaine Circle');\nINSERT INTO get_fit_now_member VALUES ('GE5Q8', 92736, 'Carmen Dimick', 20170618, 'gold');\nINSERT INTO get_fit_now_check_in VALUES ('GE5Q8', 20180109, 367, 959);\nINSERT INTO drivers_license VALUES (423327, 30, 70, 'brown', 'brown', 'male', '0H42W2', 'Chevrolet', 'Spark LS');\nINSERT INTO person VALUES (67318, 'Jeremy Bowers', 423327, 530, 'Washington Pl, Apt 3A');\nINSERT INTO get_fit_now_member VALUES ('48Z55', 67318, 'Jeremy Bowers', 20160101, 'gold');\nINSERT INTO get_fit_now_check_in VALUES ('48Z55', 20180109, 1530, 1700);\nINSERT INTO get_fit_now_member VALUES ('90081', 16371, 'Annabel Miller', 20160208, 'gold');\nINSERT INTO get_fit_now_check_in VALUES ('90081', 20180109, 1600, 1700);\nCREATE TABLE facebook_event_checkin (person_id NUMBER, event_id NUMBER, event_name VARCHAR2(200), check_in_date NUMBER, FOREIGN KEY (person_id) REFERENCES person(id));\nINSERT INTO drivers_license VALUES(101191,64,84,'blue','white','male','00NU00','Mercedes-Benz','E-Class');\nINSERT INTO person VALUES(24556,'Bryan Pardo',101191,703,'Machine Ln');\nINSERT INTO facebook_event_checkin(person_id,event_id,event_name,check_in_date) VALUES(24556,1143,'SQL Symphony Concert',20171207);\nINSERT INTO facebook_event_checkin(person_id,event_id,event_name,check_in_date) VALUES(24556,1143,'SQL Symphony Concert',20171221);\nINSERT INTO facebook_event_checkin(person_id,event_id,event_name,check_in_date) VALUES(24556,1143,'SQL Symphony Concert',20171224);\nINSERT INTO drivers_license VALUES(202298,68,66,'green','red','female','500123','Tesla','Model S');\nINSERT INTO person VALUES(99716,'Miranda Priestly',202298,1883,'Golden Ave');\nINSERT INTO facebook_event_checkin(person_id,event_id,event_name,check_in_date) VALUES(99716,1143,'SQL Symphony Concert',20171206);\nINSERT INTO facebook_event_checkin(person_id,event_id,event_name,check_in_date) VALUES(99716,1143,'SQL Symphony Concert',20171212);\nINSERT INTO facebook_event_checkin(person_id,event_id,event_name,check_in_date) VALUES(99716,1143,'SQL Symphony Concert',20171229);\nCREATE TABLE SOLUTION (crime_user INTEGER,value VARCHAR(100));\nSET PAGESIZE 5000;\n"
  const VITE_ECOMMERCE_DB_ORACLE="CREATE TABLE customers (customer_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name VARCHAR2(100) NOT NULL, email VARCHAR2(100) UNIQUE NOT NULL, phone VARCHAR2(15), address VARCHAR2(100));\nINSERT INTO customers (name, email, phone, address) VALUES ('John Doe','johndoe@gmail.com','1234567890','123 Street, City');\nINSERT INTO customers (name, email, phone, address) VALUES ('Jane Smith','janesmith@gmail.com','0987654321','456 Avenue, City');\nINSERT INTO customers (name, email, phone, address) VALUES ('Alice Johnson','alicej@gmail.com','1112223333','789 Boulevard, City');\nINSERT INTO customers (name, email, phone, address) VALUES ('Bob Brown','bobb@gmail.com','4445556666','321 Lane, City');\nINSERT INTO customers (name, email, phone, address) VALUES ('Charlie Davis','charlied@gmail.com','7778889999','654 Road, City');\nINSERT INTO customers (name, email, phone, address) VALUES ('David Miller','davidm@gmail.com','1231231234','987 Square, Town');\nINSERT INTO customers (name, email, phone, address) VALUES ('Emma Wilson','emmaw@gmail.com','5556667777','741 Drive, Suburb');\nINSERT INTO customers (name, email, phone, address) VALUES ('Frank Harris','frankh@gmail.com','8889990000','852 Plaza, Metro');\nINSERT INTO customers (name, email, phone, address) VALUES ('Grace Lee','gracel@gmail.com','3334445555','369 Court, Village');\nINSERT INTO customers (name, email, phone, address) VALUES ('Henry Adams','henrya@gmail.com','6667778888','159 Lane, Downtown');\nINSERT INTO customers (name, email, phone, address) VALUES ('Ivy Carter','ivyc@gmail.com','2223334444','753 Park, Uptown');\nINSERT INTO customers (name, email, phone, address) VALUES ('Jack Evans','jacke@gmail.com','9998887777','951 Highway, City');\nINSERT INTO customers (name, email, phone, address) VALUES ('Kelly Baker','kellyb@gmail.com','1110009999','468 Way, District');\nINSERT INTO customers (name, email, phone, address) VALUES ('Liam Turner','liamt@gmail.com','7776665555','357 Path, Riverside');\nINSERT INTO customers (name, email, phone, address) VALUES ('Mia Martin','miam@gmail.com','6665554444','852 Walk, Harbor');\nINSERT INTO customers (name, email, phone, address) VALUES ('Nathan Scott','nathans@gmail.com','4443332222','741 Route, County');\nINSERT INTO customers (name, email, phone, address) VALUES ('Olivia White','oliviaw@gmail.com','9990001111','963 Alley, Province');\nINSERT INTO customers (name, email, phone, address) VALUES ('Paul Thomas','pault@gmail.com','8887776666','258 Cross, Landmark');\nINSERT INTO customers (name, email, phone, address) VALUES ('Quinn Hall','quinnh@gmail.com','3332221111','147 Crescent, Seaside');\nINSERT INTO customers (name, email, phone, address) VALUES ('Ryan Clark','ryanc@gmail.com','5554443333','654 Road, Town');\nINSERT INTO customers (name, email, phone, address) VALUES ('Sophia Lewis','sophial@gmail.com','2221110000','369 Circle, Suburb');\nCREATE TABLE sellers (seller_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name VARCHAR2(100) NOT NULL, email VARCHAR2(100) UNIQUE NOT NULL, phone VARCHAR2(15), address VARCHAR2(100));\nINSERT INTO sellers (name, email, phone, address) VALUES ('Tech Store','techstore@gmail.com','1122334455','789 Tech Road, City');\nINSERT INTO sellers (name, email, phone, address) VALUES ('Zara','zaraclothing@gmail.com','1224334458','123 New York City');\nINSERT INTO sellers (name, email, phone, address) VALUES ('Fashion Hub','fashionhub@gmail.com','5566778899','321 Fashion Street, City');\nINSERT INTO sellers (name, email, phone, address) VALUES ('Home Essentials','homeessentials@gmail.com','9988776655','147 Home Avenue, City');\nINSERT INTO sellers (name, email, phone, address) VALUES ('Gaming World','gamingworld@gmail.com','2233445566','258 Gamer Street, City');\nCREATE TABLE products (product_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, seller_id NUMBER, name VARCHAR2(150) NOT NULL, description VARCHAR2(100), price NUMBER(10,2) NOT NULL, stock_quantity NUMBER NOT NULL);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (1, 'Laptop', 'High-performance laptop', 1200.99, 10);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (1, 'Smartphone', 'Latest model smartphone', 799.49, 15);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (2, 'Pants', 'Casual Pants', 19.99, 50);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (2, 'Pull overs', 'Winter pull overs', 29.99, 50);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (3, 'T-shirt', 'Cotton T-shirt', 19.99, 50);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (3, 'Jeans', 'Denim jeans', 39.99, 30);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (4, 'Coffee Maker', 'Automatic coffee maker', 89.99, 20);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (4, 'Vacuum Cleaner', 'Cordless vacuum cleaner', 129.99, 15);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (5, 'Gaming Console', 'Next-gen gaming console', 499.99, 8);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (6, 'Gaming Chair', 'Ergonomic gaming chair', 199.99, 12);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (6, 'Lighting Keyboard', 'The best keyboard in town', 199.99, 22);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES (2, 'Shoes', 'Air forces', 299.99, 18);\nCREATE TABLE orders (order_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, customer_id NUMBER, seller_id NUMBER, order_date TIMESTAMP, status VARCHAR2(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Shipped','Delivered','Cancelled')), total_amount NUMBER(10,2) NOT NULL, FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE, FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (1,1,TO_TIMESTAMP('2025-02-01 10:30:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',1219.98);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (2,2,TO_TIMESTAMP('2025-02-02 15:45:00','YYYY-MM-DD HH24:MI:SS'),'Pending',799.49);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (3,2,TO_TIMESTAMP('2025-02-03 12:15:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',169.98);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (4,3,TO_TIMESTAMP('2025-02-04 08:00:00','YYYY-MM-DD HH24:MI:SS'),'Cancelled',499.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (5,4,TO_TIMESTAMP('2025-02-05 17:20:00','YYYY-MM-DD HH24:MI:SS'),'Pending',329.98);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (6,5,TO_TIMESTAMP('2024-02-06 13:30:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',599.00);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (7,1,TO_TIMESTAMP('2024-02-07 09:10:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',749.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (8,1,TO_TIMESTAMP('2024-02-08 14:55:00','YYYY-MM-DD HH24:MI:SS'),'Cancelled',279.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (9,1,TO_TIMESTAMP('2024-02-09 11:45:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',459.00);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (10,2,TO_TIMESTAMP('2024-02-10 16:25:00','YYYY-MM-DD HH24:MI:SS'),'Pending',899.49);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (11,2,TO_TIMESTAMP('2024-02-11 10:00:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',110.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (12,2,TO_TIMESTAMP('2024-02-12 13:40:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',689.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (1,3,TO_TIMESTAMP('2024-02-13 07:25:00','YYYY-MM-DD HH24:MI:SS'),'Pending',214.50);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (2,3,TO_TIMESTAMP('2024-02-14 18:10:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',555.75);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (3,3,TO_TIMESTAMP('2024-02-15 12:35:00','YYYY-MM-DD HH24:MI:SS'),'Cancelled',799.25);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (4,4,TO_TIMESTAMP('2024-02-16 09:50:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',923.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (5,5,TO_TIMESTAMP('2024-02-17 15:15:00','YYYY-MM-DD HH24:MI:SS'),'Pending',305.00);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (6,3,TO_TIMESTAMP('2024-02-18 14:20:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',488.40);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (7,4,TO_TIMESTAMP('2024-02-19 16:45:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',712.30);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (8,1,TO_TIMESTAMP('2024-02-20 08:55:00','YYYY-MM-DD HH24:MI:SS'),'Cancelled',289.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (9,1,TO_TIMESTAMP('2024-02-21 14:05:00','YYYY-MM-DD HH24:MI:SS'),'Pending',920.10);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (10,2,TO_TIMESTAMP('2024-02-22 12:10:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',470.75);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (11,2,TO_TIMESTAMP('2024-02-23 10:20:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',600.00);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (12,3,TO_TIMESTAMP('2024-02-24 15:00:00','YYYY-MM-DD HH24:MI:SS'),'Pending',150.50);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (13,2,TO_TIMESTAMP('2024-02-25 17:30:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',899.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (14,4,TO_TIMESTAMP('2024-02-26 09:40:00','YYYY-MM-DD HH24:MI:SS'),'Cancelled',120.00);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (15,4,TO_TIMESTAMP('2024-02-27 11:25:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',520.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (16,1,TO_TIMESTAMP('2024-02-28 14:15:00','YYYY-MM-DD HH24:MI:SS'),'Pending',740.60);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (17,1,TO_TIMESTAMP('2024-02-29 08:10:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',315.75);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (18,1,TO_TIMESTAMP('2024-03-01 12:55:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',690.20);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (1,2,TO_TIMESTAMP('2024-03-02 10:45:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',149.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (2,1,TO_TIMESTAMP('2024-03-03 16:35:00','YYYY-MM-DD HH24:MI:SS'),'Pending',299.50);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (3,3,TO_TIMESTAMP('2024-03-04 07:20:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',400.75);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (4,2,TO_TIMESTAMP('2024-03-05 12:50:00','YYYY-MM-DD HH24:MI:SS'),'Cancelled',225.99);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (5,1,TO_TIMESTAMP('2024-03-06 18:05:00','YYYY-MM-DD HH24:MI:SS'),'Shipped',899.00);\nINSERT INTO orders (customer_id, seller_id, order_date, status, total_amount) VALUES (6,2,TO_TIMESTAMP('2024-03-07 14:20:00','YYYY-MM-DD HH24:MI:SS'),'Delivered',420.40);\nCREATE TABLE ordered_items (order_id NUMBER, product_id NUMBER, quantity NUMBER NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE, FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE, PRIMARY KEY (order_id, product_id));\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (1, 1, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (1, 3, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (2, 5, 4);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (2, 2, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (3, 7, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (3, 8, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (4, 4, 5);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (5, 6, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (6, 9, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (6, 10, 4);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (7, 1, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (7, 5, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (8, 3, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (9, 2, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (9, 8, 5);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (10, 4, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (11, 7, 4);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (12, 6, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (12, 10, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (13, 9, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (14, 1, 5);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (14, 3, 4);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (15, 5, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (16, 2, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (17, 8, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (18, 4, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (19, 7, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (20, 6, 5);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (21, 9, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (22, 10, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (23, 1, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (24, 5, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (24, 3, 4);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (25, 2, 5);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (26, 8, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (27, 4, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (28, 7, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (29, 6, 4);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (30, 9, 5);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (30, 10, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (31, 1, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (31, 3, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (32, 5, 4);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (33, 2, 3);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (34, 8, 5);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (35, 4, 1);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (36, 7, 2);\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (36, 10, 4);\nSET PAGESIZE 5000\n"
  const VITE_MURDER_DB_POSTGRES="CREATE TABLE crime_scene_report (date INT,type VARCHAR(50),description VARCHAR(255),city VARCHAR(100)); INSERT INTO crime_scene_report (date,type,description,city) VALUES(20180115, 'assault', 'Hamilton: Lee, do you yield? Burr: You shot him in the side! Yes he yields!', 'SQL City'),(20180115, 'assault', 'Report Not Found', 'SQL City'),(20180115, 'murder', 'Security footage shows that there were 2 witnesses. The first witness lives at the last house on Northwestern Dr. The second witness, named Annabel, lives somewhere on Franklin Ave.', 'SQL City'),(20171229, 'fraud', 'Why, said the Gryphon, you first form into a line along the', 'Antioch'),(20171229, 'fraud', 'Why, said the Gryphon, you first form into a line along the', 'Spokane'),(20171229, 'robbery', 'Serpent, I say again! repeated the Pigeon, but in a more subdued tone', 'West Covina'),(20171231, 'murder', 'short remarks, and she drew herself up and said, very gravely, I think', 'Glendale'),(20171231, 'theft', 'get is the same thing as I get what I like!', 'Huntington Beach'),(20171231, 'fraud', 'The door led right into a large kitchen, which was full of smoke from', 'Honolulu'),(20171231, 'blackmail', 'You are, said the King.', 'Yonkers'),(20171231, 'blackmail', 'The bullies are always blackmailing others', 'Pomona'),(20180101, 'blackmail', 'the worst situation i could have been in!', 'Frederick');CREATE TABLE drivers_license (id integer PRIMARY KEY,age integer,height integer,eye_color VARCHAR(100),hair_color VARCHAR(100),gender VARCHAR(100),plate_number VARCHAR(100),car_make VARCHAR(100),car_model VARCHAR(100));INSERT INTO drivers_license VALUES(118009,64,84,'blue','white','male','00NU00','Mercedes-Benz','E-Class');INSERT INTO drivers_license VALUES(490173,35,65,'green','brown','female','23AM98','Toyota','Yaris');INSERT INTO drivers_license VALUES(903934,29,65,'black','green','female','O5W55E','Pontiac','Firebird');INSERT INTO drivers_license VALUES(938869,57,61,'blue','red','male','6K2P7B','Volvo','S60');INSERT INTO drivers_license VALUES(690583,48,63,'black','blonde','male','NS5LP6','Mazda','Mazda3');INSERT INTO drivers_license VALUES(985615,39,77,'blue','brown','female','0WI7SG','Scion','xD');INSERT INTO drivers_license VALUES(675018,89,62,'brown','black','female','24CFT4','Isuzu','Axiom');CREATE TABLE person (id integer PRIMARY KEY, name VARCHAR(100), license_id integer, address_number integer, address_street_name VARCHAR(200), FOREIGN KEY (license_id) REFERENCES drivers_license (id));INSERT INTO person VALUES(14887,'Morty Schapiro',118009,4919,'Northwestern Dr');INSERT INTO person VALUES(14821,'Eda Snover',903934,1075,'Idalyn St');INSERT INTO person VALUES(14824,'Tobias Tow',938869,2753,'Lou Courtney St');INSERT INTO person VALUES(14827,'Marlin Hillwig',690583,3106,'Pagum Ave');INSERT INTO person VALUES(14849,'Fay Marsden',985615,580,'Deepdene Park Dr');INSERT INTO person VALUES(16371,'Annabel Miller',490173,103,'Franklin Ave');INSERT INTO person VALUES(14880,'Sena Muschick',675018,1841,'Bulkeley Rd');CREATE TABLE interview (person_id integer,transcript VARCHAR(500),FOREIGN KEY (person_id) REFERENCES person(id));INSERT INTO interview VALUES(16371,'I saw the murder happen, and I recognized the killer from my gym when I was working out last week on January the 9th.');INSERT INTO interview VALUES(14887,'I heard a gunshot and then saw a man run out. He had a \"Get Fit Now Gym\" bag. The membership number on the bag started with \"48Z\". Only gold members have those bags. The man got into a car with a plate that included \"H42W\".');CREATE TABLE get_fit_now_member (id VARCHAR(100) PRIMARY KEY,person_id integer,name VARCHAR(100),membership_start_date integer,membership_status VARCHAR(100),FOREIGN KEY (person_id) REFERENCES person(id));CREATE TABLE get_fit_now_check_in (membership_id VARCHAR(100),check_in_date integer,check_in_time integer,check_out_time integer,FOREIGN KEY (membership_id) REFERENCES get_fit_now_member(id));INSERT INTO drivers_license VALUES(108978,70,56,'brown','grey','female','OR1UPR','Volkswagen','Rabbit');INSERT INTO person VALUES(15247,'Shondra Ledlow',108978,2906,'Chuck Dr');INSERT INTO get_fit_now_member VALUES('X0643',15247,'Shondra Ledlow',20170521,'silver');INSERT INTO get_fit_now_check_in VALUES('X0643',20180109,957,1164);INSERT INTO drivers_license VALUES(402017,45,81,'black','blonde','male','8MCH5R','BMW','M5');INSERT INTO person VALUES(28073,'Zackary Cabotage',402017,3823,'S Winthrop Ave');INSERT INTO get_fit_now_member VALUES('UK1F2',28073,'Zackary Cabotage',20170818,'silver');INSERT INTO get_fit_now_check_in VALUES('UK1F2',20180109,344,518);INSERT INTO drivers_license VALUES(556026,44,58,'amber','red','female','7F7U6O','Chrysler','Pacifica');INSERT INTO person VALUES(55662,'Sarita Bartosh',556026,1031,'Legacy Pointe Blvd');INSERT INTO get_fit_now_member VALUES('XTE42',55662,'Sarita Bartosh',20170524,'gold');INSERT INTO get_fit_now_check_in VALUES('XTE42',20180109,486,1124);INSERT INTO drivers_license VALUES(952073,51,59,'amber','grey','female','KPF728','Lincoln','Aviator');INSERT INTO person VALUES(10815,'Adriane Pelligra',952073,948,'Emba Ave');INSERT INTO get_fit_now_member VALUES('1AE2H',10815,'Adriane Pelligra',20170816,'silver');INSERT INTO get_fit_now_check_in VALUES('1AE2H',20180109,461,944);INSERT INTO drivers_license VALUES(915564,33,62,'green','black','male','58G5JT','Smart','Fortwo');INSERT INTO person VALUES(83186,'Burton Grippe',915564,484,'Lemcrow Way');INSERT INTO get_fit_now_member VALUES('6LSTG',83186,'Burton Grippe',20170214,'gold');INSERT INTO get_fit_now_check_in VALUES('6LSTG',20180109,399,515);INSERT INTO drivers_license VALUES(737886,33,72,'brown','white','female','0ZC1ZV','Lincoln','Navigator L');INSERT INTO person VALUES(31523,'Blossom Crescenzo',737886,1245,'Ruxshire St');INSERT INTO get_fit_now_member VALUES('7MWHJ',31523,'Blossom Crescenzo',20180309,'regular');INSERT INTO get_fit_now_check_in VALUES('7MWHJ',20180109,273,885);INSERT INTO drivers_license VALUES(890722,60,61,'green','brown','female','SVGR5N','Audi','TT');INSERT INTO person VALUES(92736,'Carmen Dimick',890722,2965,'Kilmaine Circle');INSERT INTO get_fit_now_member VALUES('GE5Q8',92736,'Carmen Dimick',20170618,'gold');INSERT INTO get_fit_now_check_in VALUES('GE5Q8',20180109,367,959);INSERT INTO drivers_license VALUES(423327,30,70,'brown','brown','male','0H42W2','Chevrolet','Spark LS');INSERT INTO person VALUES(67318,'Jeremy Bowers',423327,530,'Washington Pl, Apt 3A');INSERT INTO get_fit_now_member VALUES('48Z55',67318,'Jeremy Bowers',20160101,'gold');INSERT INTO get_fit_now_check_in VALUES('48Z55',20180109,1530,1700);INSERT INTO get_fit_now_member VALUES('90081',16371,'Annabel Miller',20160208,'gold');INSERT INTO get_fit_now_check_in VALUES('90081',20180109,1600,1700);CREATE TABLE facebook_event_checkin (person_id integer,event_id integer,event_name VARCHAR(200),date integer,FOREIGN KEY (person_id) REFERENCES person(id));INSERT INTO drivers_license VALUES(101191,64,84,'blue','white','male','00NU00','Mercedes-Benz','E-Class');INSERT INTO person VALUES(24556,'Bryan Pardo',101191,703,'Machine Ln');INSERT INTO facebook_event_checkin VALUES(24556,1143,'SQL Symphony Concert',20171207);INSERT INTO facebook_event_checkin VALUES(24556,1143,'SQL Symphony Concert',20171221);INSERT INTO facebook_event_checkin VALUES(24556,1143,'SQL Symphony Concert',20171224);INSERT INTO drivers_license VALUES(202298,68,66,'green','red','female','500123','Tesla','Model S');INSERT INTO person VALUES(99716,'Miranda Priestly',202298,1883,'Golden Ave');INSERT INTO facebook_event_checkin VALUES(99716,1143,'SQL Symphony Concert',20171206);INSERT INTO facebook_event_checkin VALUES(99716,1143,'SQL Symphony Concert',20171212);INSERT INTO facebook_event_checkin VALUES(99716,1143,'SQL Symphony Concert',20171229);INSERT INTO interview VALUES(67318,'I was hired by a woman with a lot of money. I am not sure what her name is but I know she is around 5ft 5inch (65 cm) or 5ft 7inch (67cm). She has red hair and she drives a Tesla Model S.I know that she attended the SQL Symphony Concert 3 times in December 2017.');CREATE TABLE solution (user_id INT, value VARCHAR(100));"
  const VITE_ECOMMERCE_DB_POSTGRES="CREATE TABLE customers (customer_id SERIAL PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(100) UNIQUE NOT NULL,phone VARCHAR(15),address VARCHAR(100));\nINSERT INTO customers (name, email, phone, address) VALUES('John Doe','johndoe@gmail.com','1234567890','123 Street, City'),('Jane Smith','janesmith@gmail.com','0987654321','456 Avenue, City'),('Alice Johnson','alicej@gmail.com','1112223333','789 Boulevard, City'),('Bob Brown','bobb@gmail.com','4445556666','321 Lane, City'),('Charlie Davis','charlied@gmail.com','7778889999','654 Road, City'),('David Miller','davidm@gmail.com','1231231234','987 Square, Town'),('Emma Wilson','emmaw@gmail.com','5556667777','741 Drive, Suburb'),('Frank Harris','frankh@gmail.com','8889990000','852 Plaza, Metro'),('Grace Lee','gracel@gmail.com','3334445555','369 Court, Village'),('Henry Adams','henrya@gmail.com','6667778888','159 Lane, Downtown'),('Ivy Carter','ivyc@gmail.com','2223334444','753 Park, Uptown'),('Jack Evans','jacke@gmail.com','9998887777','951 Highway, City'),('Kelly Baker','kellyb@gmail.com','1110009999','468 Way, District'),('Liam Turner','liamt@gmail.com','7776665555','357 Path, Riverside'),('Mia Martin','miam@gmail.com','6665554444','852 Walk, Harbor'),('Nathan Scott','nathans@gmail.com','4443332222','741 Route, County'),('Olivia White','oliviaw@gmail.com','9990001111','963 Alley, Province'),('Paul Thomas','pault@gmail.com','8887776666','258 Cross, Landmark'),('Quinn Hall','quinnh@gmail.com','3332221111','147 Crescent, Seaside'),('Ryan Clark','ryanc@gmail.com','5554443333','654 Road, Town'),('Sophia Lewis','sophial@gmail.com','2221110000','369 Circle, Suburb');\nCREATE TABLE sellers (seller_id SERIAL PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(100) UNIQUE NOT NULL,phone VARCHAR(15),address VARCHAR(100));\nINSERT INTO sellers (name, email, phone, address) VALUES('Tech Store','techstore@gmail.com','1122334455','789 Tech Road, City'),('Zara','zaraclothing@gmail.com','1224334458','123 New York City'),('Fashion Hub','fashionhub@gmail.com','5566778899','321 Fashion Street, City'),('Home Essentials','homeessentials@gmail.com','9988776655','147 Home Avenue, City'),('Gaming World','gamingworld@gmail.com','2233445566','258 Gamer Street, City');\nCREATE TABLE products (product_id SERIAL PRIMARY KEY,seller_id INT,name VARCHAR(150) NOT NULL,description VARCHAR(100),price DECIMAL(10,2) NOT NULL,stock_quantity INT NOT NULL);\nINSERT INTO products (seller_id, name, description, price, stock_quantity) VALUES(1,'Laptop','High-performance laptop',1200.99,10),(1,'Smartphone','Latest model smartphone',799.49,15),(2,'Pants','Casual Pants',19.99,50),(2,'Pull overs','Winter pull overs',29.99,50),(3,'T-shirt','Cotton T-shirt',19.99,50),(3,'Jeans','Denim jeans',39.99,30),(4,'Coffee Maker','Automatic coffee maker',89.99,20),(4,'Vacuum Cleaner','Cordless vacuum cleaner',129.99,15),(5,'Gaming Console','Next-gen gaming console',499.99,8),(6,'Gaming Chair','Ergonomic gaming chair',199.99,12),(6,'Lighting Keyboard','The best keyboard in town',199.99,22),(2,'Shoes','Air forces',299.99,18);\nCREATE TABLE orders (order_id SERIAL PRIMARY KEY,customer_id INT,seller_id INT,order_date TIMESTAMP,status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Shipped','Delivered','Cancelled')),total_amount DECIMAL(10,2) NOT NULL,FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE,FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE);\nINSERT INTO orders (customer_id,seller_id, order_date, status, total_amount) VALUES(1,1,'2025-02-01 10:30:00','Shipped',1219.98),(2,2,'2025-02-02 15:45:00','Pending',799.49),(3,2,'2025-02-03 12:15:00','Delivered',169.98),(4,3,'2025-02-04 08:00:00','Cancelled',499.99),(5,4,'2025-02-05 17:20:00','Pending',329.98),(6,5,'2024-02-06 13:30:00','Shipped',599.00),(7,1,'2024-02-07 09:10:00','Delivered',749.99),(8,1,'2024-02-08 14:55:00','Cancelled',279.99),(9,1,'2024-02-09 11:45:00','Shipped',459.00),(10,2,'2024-02-10 16:25:00','Pending',899.49),(11,2,'2024-02-11 10:00:00','Delivered',110.99),(12,2,'2024-02-12 13:40:00','Shipped',689.99),(1,3,'2024-02-13 07:25:00','Pending',214.50),(2,3,'2024-02-14 18:10:00','Delivered',555.75),(3,3,'2024-02-15 12:35:00','Cancelled',799.25),(4,4,'2024-02-16 09:50:00','Shipped',923.99),(5,5,'2024-02-17 15:15:00','Pending',305.00),(6,3,'2024-02-18 14:20:00','Delivered',488.40),(7,4,'2024-02-19 16:45:00','Shipped',712.30),(8,1,'2024-02-20 08:55:00','Cancelled',289.99),(9,1,'2024-02-21 14:05:00','Pending',920.10),(10,2,'2024-02-22 12:10:00','Delivered',470.75),(11,2,'2024-02-23 10:20:00','Shipped',600.00),(12,3,'2024-02-24 15:00:00','Pending',150.50),(13,2,'2024-02-25 17:30:00','Delivered',899.99),(14,4,'2024-02-26 09:40:00','Cancelled',120.00),(15,4,'2024-02-27 11:25:00','Shipped',520.99),(16,1,'2024-02-28 14:15:00','Pending',740.60),(17,1,'2024-02-29 08:10:00','Delivered',315.75),(18,1,'2024-03-01 12:55:00','Shipped',690.20),(1,2,'2024-03-02 10:45:00','Delivered',149.99),(2,1,'2024-03-03 16:35:00','Pending',299.50),(3,3,'2024-03-04 07:20:00','Shipped',400.75),(4,2,'2024-03-05 12:50:00','Cancelled',225.99),(5,1,'2024-03-06 18:05:00','Shipped',899.00),(6,2,'2024-03-07 14:20:00','Delivered',420.40);\nCREATE TABLE ordered_items (order_id INT,product_id INT,quantity INT NOT NULL,FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,primary key(order_id,product_id));\nINSERT INTO ordered_items (order_id, product_id, quantity) VALUES (1, 1, 2),(1, 3, 1),(2, 5, 4),(2, 2, 2),(3, 7, 3),(3, 8, 1),(4, 4, 5),(5, 6, 2),(6, 9, 3),(6, 10, 4),(7, 1, 1),(7, 5, 2),(8, 3, 3),(9, 2, 1),(9, 8, 5),(10, 4, 2),(11, 7, 4),(12, 6, 3),(12, 10, 1),(13, 9, 2),(14, 1, 5),(14, 3, 4),(15, 5, 3),(16, 2, 2),(17, 8, 1),(18, 4, 3),(19, 7, 2),(20, 6, 5),(21, 9, 1),(22, 10, 2),(23, 1, 3),(24, 5, 2),(24, 3, 4),(25, 2, 5),(26, 8, 1),(27, 4, 3),(28, 7, 2),(29, 6, 4),(30, 9, 5),(30, 10, 3),(31, 1, 1),(31, 3, 2),(32, 5, 4),(33, 2, 3),(34, 8, 5),(35, 4, 1),(36, 7, 2),(36, 10, 4);"
 
  
  const handleSubmit = async (type) => {
    setCanSubmit(false);
    setResult(null);
    setError(null);
    
    if (userAnswer === "") {
      setError("Write a query to proceed further");
      setCanSubmit(true);
      return;
    } else if (selectedQuery.markDone) {
      setError("Query Already solved");
      setCanSubmit(true);
      return;
    }
    
    let db ;
    if (user.level >= 4) {
      if (selectedDialect === "mysql")
        db = VITE_MURDER_DB_MYSQL;
      else if (selectedDialect === "oracle")
        db = VITE_MURDER_DB_ORACLE;
      else if (selectedDialect === "postgresql")
        db = VITE_MURDER_DB_POSTGRES;
      else throw new Error("Invalid dialect found!");
    } 
    else {
      if (selectedDialect === "mysql")
        db = VITE_ECOMMERCE_DB_MYSQL;
      else if (selectedDialect === "postgresql")
        db = VITE_ECOMMERCE_DB_POSTGRES;
      else if (selectedDialect === "oracle")
        db = VITE_ECOMMERCE_DB_ORACLE;
    }
    
    const formattedDb = 
  (selectedDialect === 'oracle' ? 'SET COLSEP "|";\n' : '') 
  + db + userAnswer + (selectedDialect === 'oracle' ? ';\nEXIT;' : '');
    
    // console.log('trying to submitt ',formattedDb);
    const options = {
      method: "POST",
      url: "https://onecompiler-apis.p.rapidapi.com/api/v1/run",
      headers: {
        "x-rapidapi-key": import.meta.env.VITE_API_KEY,
        "x-rapidapi-host": "onecompiler-apis.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      data: {
        language: selectedDialect,
        stdin: "",
        files: [
          {
            name: "TestQuery.sql",
            content: formattedDb,
          },
        ],
      },
    };
    
    try {
      const testRes = await axios.request(options);
      if (testRes.data.exception || testRes.data.stderr || testRes.data.status == "failed") {
        setError(testRes.data.stderr);
        setCanSubmit(true);
        return;
      } else if (selectedDialect === "oracle" ) {
        if(testRes.data?.stdout?.includes("ERROR"))
        setError(testRes.data.stdout);
      else   setError('Oracle Query executed without any errors');

      }
      
      if (testRes.data.stdout === null) {
        setError("SQL query successfully executed. However, the result set is empty.");
        setCanSubmit(true);
        return;
      }
      // console.log(testRes.data.stdout);
      
      const parsedRes =
      selectedDialect !== "oracle"
      ? parseTableString(testRes.data.stdout) : null;
  
      
      setResult(parsedRes);
      if (type === "test" || error || testRes.data.stderr){
        setCanSubmit(true);
        return;
      }
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/submitFile`,
        JSON.stringify({
          query: selectedQuery,
          email: user.email,
          team_id: user.team_id,
          answer: testRes.data.stdout,
          selectedDialect,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      setShowSubmissionWindow(true);
    } catch (err) {
      alert("Failed to upload file: " + err.message);
      setCanSubmit(true);
    }
  };

  let scale = 1; // Initial zoom level
  let offsetX = 0; // Horizontal offset
  let offsetY = 0; // Vertical offset

  const zoomToLevel = (newScale, centerX = 0.5, centerY = 0.5) => {
    scale = newScale;
    const mapImage = document.getElementById("map-image");
    const mapWrapper = document.getElementById("map-wrapper");

    // Calculate offsets to center based on the given coordinates
    const containerWidth = mapWrapper.offsetWidth;
    const containerHeight = mapWrapper.offsetHeight;
    const imageWidth = mapImage.naturalWidth * scale;
    const imageHeight = mapImage.naturalHeight * scale;

    offsetX = containerWidth / 2 - centerX * imageWidth;
    offsetY = containerHeight / 2 - centerY * imageHeight;

    // Apply the transformation
    mapImage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  };
  const levels = [
    { number: 1, x: 0.01, y: 0.01 },
    { number: 2, x: -0.08, y: 0.09 },
    { number: 3, x: -0.08, y: 0.31 },
    { number: 4, x: -0.082, y: 0.4 },
    { number: 5, x: 0.028, y: 0.38 },
    { number: 6, x: 0.313, y: 0.386 },
    { number: 7, x: 0.222, y: 0.054 },
    { number: 8, x: 0.153, y: 0.17 },
  ];

  useEffect(() => {
    // zoomToLevel(2.5,0.178,0.053);
    const currLevel = levels[user.level - 1];
    zoomToLevel(2.5, currLevel.x, currLevel.y);
  }, []);
  
  useEffect(() => {
    if (user && !user.loggedIn) navigate("/");
    else if(!user) setLoading(true);
    else {
      console.log('sending request to fetch queriess');
      fetchQueries();
      setLoading(false);
    }
  }, [user, user.loggedIn]);
  

  return (
    <div className="min-h-screen bg-black px-4 py-8">
                  {showPopup && <CompletionPopup onClose={() => {setShowPopup(false); navigate('/leaderboard') }} />}

      <div className={`max-w-7xl mx-auto space-y-6`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">    
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FiMap className="text-red-500" />
              Progress Map
            </h2>
            <p className="mt-2 mb-4 text-white font-bold whitespace-pre-line text-center">
Solve all queries at each level to advance toward the **Final Spot**—where only the true SQL Pirate King reigns! 👑💀 
Can you master the **Grand Line of Joins** and claim victory? 
</p>

            <div
              className="relative bg-gray-800 rounded-lg overflow-hidden flex justify-center items-center"
              style={{ height: "400px" }}
            >
              <div
                className="absolute size-full flex justify-center items-center inset-0"
                id="map-wrapper"
              >
                <img
                  id="map-image"
                  src="/images/sample_map.jpg"
                  alt="Competition Map"
                  className="size-full"
                  style={{
                    transition: "transform 0.3s ease-in-out",
                    transformOrigin: "center",
                  }}
                  onClick={() => {
                    zoomToLevel(2, 0.2, 0.2);
                  }}
                />
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                <div className="w-4 h-4 bg-red-500 rounded-full absolute top-0"></div>
              </div>
            </div>
            <div className="mt-2 mb-4 text-white font-bold whitespace-pre-line text-center">
               Maintain a submission acceptance streak for a surprise 😎 
              <p> We advise you to view each question in the pdf file via the 'view pdf' button </p>

            </div>
    
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FiBookOpen className="text-red-500" />
                  Selected Challenge
                </h2>
                <p className="text-gray-400 mt-1">Level {user.level} Queries</p>
              </div>
            
              <div>
              <div className="px-4 py-2 rounded-full text-sm font-medium bg-red-500/10 text-red-500">
                {Array.isArray(queries) && queries.length} Queries Available
              </div>              
             <a
                href={
                  selectedDialect === 'mysql' ? '/documents/mysql syntax book.pdf' :
                  selectedDialect === 'oracle' ? '/documents/oracle syntax book.pdf' :
                  '/documents/postgres syntax book.pdf' 
                  } 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative top-4 px-4 py-2 rounded-full text-sm font-medium bg-red-500/10 text-red-500">
                  View syntax book 📖
              </a>
              </div>
            </div>

            {selectedQuery.id ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">
                    {selectedQuery.title}
                  </h3>
                  <span
                    className={`mt-2 px-3 py-1 rounded-full text-sm ${
                      selectedQuery.difficulty === "Hard"
                        ? "bg-red-500/20 text-red-500"
                        : selectedQuery.difficulty === "Easy"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-yellow-500/20 text-yellow-500"
                    }`}
                  >
                    {selectedQuery.difficulty}
                  </span>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <pre className="text-white text-sm whitespace-pre-wrap break-words ">
                    {selectedQuery.description}
                  </pre>
                </div>
                <div className="flex justify-between items-center w-full">
                  <div className="relative w-48">
                    <select
                      className="appearance-none w-full px-4 py-2 pr-10 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors outline-none cursor-pointer"
                      onChange={(e) => setSelectedDialect(e.target.value)}
                    >
                      <option value="mysql">MySQL</option>
                      <option value="oracle">Oracle</option>
                      <option value="postgresql">PostgreSQL</option>
                    </select>

                    <FiChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                  </div>

                  <a
                    href={selectedQuery.pdfURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                  >
                    <FiDownload className="text-red-500" />
                    View in PDF
                  </a>
                </div>

                <div className="h-full">
                {message && <OraclePopup message={message} onClose={() => setMessage(null)} />}


                  <textarea
                    name="queryEditor"
                    id="queryEditorId"
                    placeholder="Write your query here"
                    value={userAnswer}
                    onChange={(e) => {
                      setUserAnswer(e.target.value);
                      setError(null);
                    }}
                    className="bg-white w-full p-4 rounded-lg text-black text-base whitespace-pre-wrap break-words font-mono h-[180px]"
                  />
                  {error && (
                    <p className=" font-bold text-md text-red-600">
                      {error}
                    </p>
                  )}
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    className={`w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors ${!canSubmit && 'cursor-wait'}`}
                    onClick={() => handleSubmit("test")}
                    disabled = {!canSubmit}
                  >
                    <FiPlay className="w-5 h-5" />
                    Test
                  </button>
                  <button
                    type="submit"
                    className={`w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      (!canSubmit) && "cursor-wait"
                    }`}
                    disabled={!canSubmit}
                    onClick={() => handleSubmit("submit")}
                  >
                    <FiCheck className="w-5 h-5" />
                    Submit Solution
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400">No query selected</p>
            )}
          </div>
        </div>

        {result && result.length > 0 ? (
          <div className="mt-4 overflow-x-auto ">
            <p className="text-center text-white text-xl font-bold mb-2">
              Your output
            </p>
            {result.length > 10 && (
              <p className="text-center text-white text-md mb-2">
                In case of results containing multiple rows,only the first 10 rows are displayed
              </p>
            )}

            <table className="min-w-full border border-gray-700">
              <thead>
                <tr className="bg-red-600 text-white">
                  {Object.keys(result[0]).map((key) => (
                    <th key={key} className="border border-gray-700 px-4 py-2">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* .slice(0, 10) */}
                {result.slice(0, 10).map((row, index) => (
                  <tr
                    key={index}
                    className="border border-gray-700 odd:bg-gray-900 even:bg-gray-800 text-white"
                  >
                    {Object.values(row).map((value, idx) => (
                      <td
                        key={idx}
                        className="border border-gray-700 px-4 py-2"
                      >
                        {value || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FiUnlock className="text-red-500" />
            Available Queries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(queries) &&
              queries.map((query) => (
                <button
                  key={query.id}
                  onClick={() => {
                    setSelectedQuery(query);
                    setResult("");
                  }}
                  className={`p-4 rounded-lg text-left transition-all h-full ${
                    selectedQuery.id === query.id
                      ? "bg-red-500/10 border-2 border-red-500"
                      : "bg-gray-800 border-2 border-transparent hover:border-red-500/50"
                  } `}
                  disabled={query.markDone}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white">{query.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ml-2 ${
                        query.markDone
                          ? "bg-green-500/20  text-white font-bold"
                          : query.difficulty === "hard"
                          ? "bg-red-500/20 text-red-500"
                          : query.difficulty === "easy"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-yellow-500/20 text-yellow-500"
                      }`}
                    >
                      {query.markDone ? "solved" : query.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 break-words whitespace-pre-wrap line-clamp-3">
                    {query.description}
                  </p>
                </button>
              ))}
          </div>
        </div>

        {/* <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FiCode className="text-red-500" />
            Submit Solution
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  SQL Dialect
                </label>
                <select
                  value={selectedDialect}
                  onChange={(e) => setSelectedDialect(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-red-500"
                  required
                >
                  <option value="MySQL">MySQL</option>
                  <option value="Oracle">Oracle</option>
                  <option value="NoSQL">NoSQL</option>
                  <option value="Postgres">Postgres</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Solution File
                </label>
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 cursor-pointer hover:border-red-500 transition-colors">
                  <FiUpload className="text-red-500" />
                  <span className="truncate">
                    {selectedFile ? selectedFile.name : "Select a file"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    required
                  />
                </label>
              </div>
            </div> */}
        {/* 
            <button
              type="submit"
              className={`w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors ${showSubmissionWindow && 'cursor-not-allowed'}`}
              disabled = {showSubmissionWindow}
            >
              <FiCheck className="w-5 h-5" />
              Submit Solution
            </button>
          </form>
        </div>       */}
      </div>

      {showDemo && <Demo setDemo={setDemo} />}

      {showSubmissionWindow && (
        <SubmissionWindow
          query={selectedQuery}
          dialect={selectedDialect}
          setCanSubmit={setCanSubmit}
          toggleWindow={() => {
            setShowSubmissionWindow((prev) => !prev);
          }}
          toggledSelected={() => {
            setQueries((prev) =>
              prev.map((query) =>{
                return  query.queryId === selectedQuery.queryId
                          ? { ...query, markDone: true }
                          : query
                }
              )
            );
            
            const tempQuery = queries.filter(query => (query.queryId !== selectedQuery.queryId && query.markDone === false))[0]
            
            
            
            setSelectedQuery(tempQuery ? {...tempQuery} : []);
            setUserAnswer("");
            setResult("");
            setError(null);
            setCanSubmit(true);
            fetchLevel()
          }}
        />
      )}

      <div className="fixed top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -z-10"></div>
    </div>
  );
};

export default QueryPage;
