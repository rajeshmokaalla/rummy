# Rummy Scorekeeper

This is a simple web application to keep score for a Rummy game.

## Features:
- Add and remove players.
- Record scores for each round.
- Automatically calculates and displays total scores.
- Announces a winner when a player reaches 201 points (or more) and others are at or below 200 points.

## How to Use:

1.  **Create a new repository** on your Git platform of choice (e.g., GitHub, GitLab, Bitbucket).
2.  **Clone the repository** to your local machine.
3.  **Copy the files** from the `rummy-game` directory created by Claude into the root of your new repository.
    *   `public/index.html`
    *   `public/style.css`
    *   `public/script.js`
4.  **Open `index.html`** in your web browser to start using the Rummy Scorekeeper.

## Game Rules Implemented:

-   Players enter the game.
-   For each round, players enter the points they scored.
-   Total scores are accumulated.
-   A player is "out" if their total score reaches 201 or more.
-   The winner is the player who remains *under or at* 200 points when all other players are out (total score >= 201).
