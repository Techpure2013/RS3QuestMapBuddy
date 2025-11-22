import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./../app";
import PlotApp from "./../../app/plot/PlotApp";

const MainRouter: React.FC = () => {
  return (
    <BrowserRouter basename="/RS3QuestBuddyEditor">
      <Routes>
        {/* Optional default editor home */}
        <Route path="/" element={<App />} />
        {/* Your dynamic map route (kept exactly) */}
        <Route path="/:UserID/:QuestName/:level-:z-:x-:y" element={<App />} />
        {/* Plot workspace */}
        <Route path="/plot/:questName/:step" element={<PlotApp />} />
        {/* Fallback to home if unmatched */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MainRouter;
