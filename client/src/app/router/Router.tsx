import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import App from "./../app"; // Your map component

const MainRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Dynamic route for user-specific maps */}
        <Route path="/:UserID/:QuestName/:level-:z-:x-:y" element={<App />} />
      </Routes>
    </Router>
  );
};

export default MainRouter;
