import React, { useState } from "react";
import { Marker, Popup, Rectangle } from "react-leaflet"; // Use React Leaflet components
import { LatLngBoundsLiteral, LatLngTuple, Icon } from "leaflet"; // Import the correct types

const QuestHighlightLayer: React.FC<{ questSteps: any[] }> = ({
  questSteps,
}) => {
  // Define a fixed-size custom icon for markers
  const fixedIcon = new Icon({
    iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-green.png", // Replace with your icon URL
    iconSize: [20, 20], // Fixed size [width, height]
    iconAnchor: [10, 10], // Anchor point (center the icon)
    popupAnchor: [0, -10], // Popup position relative to the icon
  });

  // State to track the current step index
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Get the current step
  const currentStep = questSteps[currentStepIndex];

  // Handle the Next button click
  const handleNext = () => {
    setCurrentStepIndex((prevIndex) => (prevIndex + 1) % questSteps.length); // Loop back to the first step
  };

  // Helper function to calculate the center of multiple locations
  const calculateCenter = (
    locations: { lat: number; lng: number }[]
  ): LatLngTuple => {
    const avgLat =
      locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    const avgLng =
      locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;

    return [avgLat, avgLng];
  };

  // Helper function to parse coordinates for Leaflet's Rectangle bounds
  const parseCoordinates = (
    bottomLeft: { lat: number; lng: number },
    topRight: { lat: number; lng: number }
  ): LatLngBoundsLiteral => {
    const interval = 1;

    // Adjust coordinates to align with the tile grid system and shift to the right
    const adjustedBottomLeft: LatLngTuple = [
      Math.floor(bottomLeft.lat + 0.5) - 0.5,
      Math.floor(bottomLeft.lng - 0.5) + 0.5 + 1, // Shift to the right
    ];
    const adjustedTopRight: LatLngTuple = [
      Math.floor(topRight.lat + 0.5) - 0.5 + interval,
      Math.floor(topRight.lng - 0.5) + 0.5 + interval + 1, // Shift to the right
    ];

    return [adjustedBottomLeft, adjustedTopRight];
  };

  return (
    <div>
      {/* Display the current step description */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1000,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          padding: "10px",
          borderRadius: "5px",
          maxWidth: "300px",
        }}
      >
        <h4>Step {currentStepIndex + 1}</h4>
        <p>{currentStep.stepDescription}</p>
      </div>

      {/* Map Highlights */}
      {currentStep.highlights.npc.length > 0 &&
        currentStep.highlights.object.every(
          (obj: any) => obj.objectLocation[0].lat === 0
        ) && (
          <>
            {/* Highlight NPCs */}
            {currentStep.highlights.npc.map((npc: any, npcIndex: number) => (
              <React.Fragment key={npcIndex}>
                {/* NPC Marker */}
                <Marker
                  position={[npc.npcLocation.lat, npc.npcLocation.lng]}
                  icon={fixedIcon}
                >
                  <Popup>{npc.npcName}</Popup>
                </Marker>

                {/* NPC Wander Radius */}
                <Rectangle
                  bounds={parseCoordinates(
                    npc.wanderRadius.bottomLeft,
                    npc.wanderRadius.topRight
                  )}
                  pathOptions={{
                    color: "blue",
                    weight: 1,
                    fillOpacity: 0.3,
                  }}
                />
              </React.Fragment>
            ))}
          </>
        )}

      {currentStep.highlights.object.some(
        (obj: any) => obj.objectLocation[0].lat !== 0
      ) && (
        <>
          {/* Highlight Objects */}
          {currentStep.highlights.object.map(
            (object: any, objectIndex: number) => (
              <React.Fragment key={objectIndex}>
                {/* Object Bounding Box */}
                <Rectangle
                  bounds={parseCoordinates(
                    object.objectRadius.bottomLeft,
                    object.objectRadius.topRight
                  )}
                  pathOptions={{
                    color: "red",
                    weight: 1,
                    fillOpacity: 0.1,
                  }}
                />

                {/* Object Marker */}
                {object.objectLocation.map(
                  (location: any, locIndex: number) => (
                    <Marker
                      key={locIndex}
                      position={[location.lat, location.lng]}
                      icon={fixedIcon}
                    >
                      <Popup>{object.name}</Popup>
                    </Marker>
                  )
                )}
              </React.Fragment>
            )
          )}
        </>
      )}

      {/* Next Button */}
      <button
        onClick={handleNext}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 1000,
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Next
      </button>
    </div>
  );
};

export default QuestHighlightLayer;
