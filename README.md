# Transferring Thermal Energy — Grade 11 Live Quiz

A small real-time classroom quiz website. Students join using a PIN, name, and class. The teacher can start questions, watch who has answered, reveal results, and view scores/leaderboard.

## Run it on your computer

Requirements: Node.js 18 or newer.

1. Unzip this folder.
2. Open a terminal in the folder.
3. Run `npm install`
4. Run `npm start`
5. Open `http://localhost:3000` in a browser.

For testing on the same Wi-Fi, students may be able to open the teacher computer's local network address (for example `http://192.168.1.10:3000`) if the firewall allows it. For students joining from different networks, deploy it online.

## Publish it online (recommended: Render + GitHub)

1. Create/sign in to a GitHub account.
2. Create a new repository and upload these files (`server.js`, `package.json`, and the `public` folder).
3. Create/sign in to Render and choose **New → Web Service**.
4. Connect the GitHub repository.
5. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
6. Deploy, then open the HTTPS URL Render gives you.
7. Share that URL with students. The teacher opens it, chooses **Teacher dashboard**, clicks **Create live quiz room**, then shares the six-digit PIN.

Hosting provider screens and free-plan limits can change. You do not need a paid database for this prototype; the server stores a live room in memory.

## Important limitations

- This is a working prototype, not a managed school platform.
- The quiz room and scores are held in server memory. Restarting/redeploying the server clears them. For repeated use, persistent history, or multiple simultaneous classes, add a database such as Supabase or Firebase.
- Keep one teacher host per room. Do not restart the server while a class is playing.
- Use first names or school-approved display names and avoid collecting unnecessary personal information.
- Test with a teacher account and two student devices before using it with a class.
- It currently includes 20 questions about conduction, convection, radiation, conductors, and insulators. Questions are scored at 1,000 points each. There is no countdown timer yet.
