# Goal

The goal of this project is to develop a comprehensive and accurate quest tool for RuneScape 3, focused on improving the quality, structure, and usability of quest data.

---

🧭 Objectives

1. Refine Quest Data

- Move quest data into properly structured and descriptive fields.

- Rewrite or adjust confusing quest steps and details to improve clarity and context.

- Ensure consistency across all quest entries for readability and organization per step.

2. Map NPCs and Objects

- Accurately map NPCs and Objects with verified or around the general area in-game coordinates.

- Link each NPC and object to wiki data or custom asset references if possible.

- Include fallback systems for images using the Asset Creation Tool.

# Installation of Node JS, NPM

Open Powershell and copy and paste the text below.

## Download and install Chocolatey:

powershell -c "irm https://community.chocolatey.org/install.ps1|iex"

## Download and install Node.js:

choco install nodejs --version="25.0.0"

## Verify the Node.js version:

node -v # Should print "v25.0.0".

## Verify npm version:

npm -v # Should print "11.6.2".

## Download VS Code

https://code.visualstudio.com/

## Open VS Studio Code:

- Click Clone Git Repository...
- Paste the following: https://github.com/Techpure2013/RS3QuestMapBuddy.git

## To Start the Editor:

- Open the terminal at the top then enter the following commands:
- cd client
- npm install
- cd ..
- cd server
- npm install
- cd ..
- npm install
- npm run build
- npm run start

# Get to know your editor:

- You have the Load Chathead JSON button
  - when you click this button travel to client/src/Map Classes/Map Data/chatheadOverrides.json and select
  - This enables the use of the Asset Creation Tool Chat Head Override
- You have the Load Quest Image List Button
  - 1/2 Requirement for Asset Tool for pasting in images or links to images
  - select the client/src/Map Classes/Map Data/QuestImageList.json
- You have the Select a Image Directory Button
  - 2/2 Requirement for Asset Tool for pasting in images or links to images
  - select the client/src/Map Classes/Map Data/Images/
    - Create new folder if the quest folder is not present.
- Load Master File Button ( ONE TIME ONLY USE )
- Used to Load client/src/Map Classes/Map Data/QuestDetails.json
- Loads Quest Details of every quest into IndexDB for this single project
- Save Master File ( Save Only when Quest Details is edited )
- New Quest Button Creates A new Quest
  - When a New Quest is SAVED it will go to your downloads folder.
    - Make a new Folder under Quest Directories with the specified Quest
    - Drop the File into the Folder and Change the name to the corresponding quest "questname.json".
- Load Quest Button
  - Loads a quest to edit of your choosing from client/src/Quest Directories/Quest Name Directory/questname.json
- Save Button
  - Saves the questname.json to its respected folder.
- Save As Button
  - Saves to your Downloads Folder a questname.json file which you can send to Techpure ( me )
- Submit to Github Button
  - Button does not work IF:
    - You do not have the .env file given to you by techpure
    - You do not have the .env file in the RS3QuestMapBuddy/server/ Directory
    - You have edited in any way the .env file
- You have the Quest Details Component:
  - Refresh Button
    - Refreshes Quest Details
  - Edit Button
    - Opens into the Quest Details Editor
      - Click the Expand Button to the Right
        - You are able to edit the fields:
          - Quest Name:
            - Text Field for Quest Name
          - Start Point:
            - Text Field for the Starting Point of the Quest
          - Member Requirement:
            - Free to Play or Members
          - Official Length:
            - Very Short to Very Long
          - Requirements:
            - Text Field is to Edit the Text inside
            - Red Button is to Delete the Field
            - Green Add Item + Button Gives Another Field
          - Items Required:
            - Text Field is to Edit the Text inside
            - Red Button is to Delete the Field
          - Recommended:
            - Text Field is to Edit the Text inside
            - Red Button is to Delete the Field
          - Enemies to Defeat
            - Text Field is to Edit the Text inside
            - Red Button is to Delete the Field
    - Green Floppy Disk is Save ( onClick will exit out of editing state )
    - Red X is Exit without Saving
  - Expand Button exposes the Quest Details
- Step Description Field
  - Checking the Checkbox will allow you to edit the field
- Items Needed and Items Required Text Boxes
  - Edits Items Needed and Items Required Fields
  - No need to Shift-Enter just press enter to go to the new line
- Additional Info Text Box
  - I use this field for Additional Steps, Additional Teleportation Information relevant to the step etc...
- Step Number - or + Button
  - Used to Navigate through the steps.
- Floor - or + Button
  - Used to Navigate the Levels of the Map up to 3 down to -1 ( no -1 floors found so far )
- Add Step Button
  - Adds a step in front of the step your on if your on 3 then it will add a step 4 in front
- Delete Step Button
  - Deletes the Step you are on ( CAUTION: Cannot UNDO this process )
- Target Type
  - NPC
    - Shows the List of NPC's you created
    - You can Copy the entire list and paste it into another step.
    - You can Copy the Single Selected NPC and Paste it into another step
    - You can Name the NPC
      - If you name the NPC Correctly it fetches from the Wiki giving a chathead of that NPC
        - IF you do not get a chathead use the Asset Creation Tool Chathead
    - Reveals Reset NPC Location, Add New NPC, and Delete NPC, Radius, Set Area by Corner, Reset Area
      - Reset NPC Locations
        - Resets the placed NPC Point.
      - Add New NPC
        - Adds a Blank NPC Object
      - Delete NPC
        - Removes the NPC Object Permanantly
      - Default a Radius 0 to Big Number
        - When Apply to Center is clicked it sets that radius around the NPC
      - Set Area by Corners
        - Sets a point clicked on the map in two areas Bottom Left, Top Right creates a radius around the object
        - TWO POINTS ARE REQUIRED. Double Clicking the same box will result in 1 point by 1 point Radius at selected point.
    - Reset Area
      - Resets the Radius
  - Object
    - Shows the List of Objects you created
    - You can Copy the entire list and paste it into another step.
    - You can Copy the Single Selected Object and Paste it into another step
    - You can Name the Object
      - If you name the Object Correctly it fetches from the Wiki giving a object image of that Object
        - IF you do not get a object image use the Asset Creation Tool Chathead to create one find an appropriate image if applicable.
    - Reveals Object Color, Object Label ( Number ), Add New Object, and Delete Object, Set Area By Corners, Reset Area
      - Object Color
        - A Range of Colors 16,777,216 to be specific
        - Selected Color will show when point is selected on the map
      - Object Number ( acts as a label )
        - When text or number is present will display when point is chosen on the map
      - Add New Object
        - Adds a Blank Object
      - Delete Object
        - Removes the Object Permanantly
    - Set Area by Corners
      - Sets a point clicked on the map in two areas Bottom Left, Top Right creates a radius around the object
      - TWO POINTS ARE REQUIRED. Double Clicking the same box will result in 1 point by 1 point Radius at selected point.
    - Reset Area
      - Resets the Radius
- NPC Search
  - Searches through the local database of NPC's
  - Not all NPC's are available
- Object Search
  - By Name will reveal objects in the entire map by that name
  - Search By Area when clicked and point clicked on map will give items within a 10 point radius around the clicked point of objects
- Another Save Master File Quest List for Quest Details
- At the very bottom it will have what the entire file looks like in json and will change upon anything changed in the above fields.
