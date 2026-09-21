# Agentic Coding Study

Develop a simple apps to create learning games from resources. Compare the lastest agents with Claude, Codex, Cursor, Copilot, and Antigravity.

## Claude Prompt

The goal is to build a web application for playing learning games. Cost is a concern so seek approval before using agent resources.

StudyScheme is the name of the app. The app allows a person to create a User. Users can manage their Resources and play one of the provided games to study the Resources with. A Resource has a name and text content provided by the User. There are two game types the user can play. When a game is played the resources are processed by an AI to extract knowledge for use in the game. This knowledge should be stored so that if the resources are the same there is no need to for the AI. There is always button to quit the game while playing.

One game has related Pairs extracted from the resources. A Pair is two related sentences of AI summarized text from the resources. The game is played in rounds. 4 Pairs are randomly selected and displayed to the User for a round of the game. Each sentence of the Pair is displayed as a Block with the sentence text inside. The User matches between the Blocks them by clicking on one of Blocks then clicking on the matching block. The match is a success if the two Blocks come from the same Pair. When a Block is clicked on it is highlighted to show interaction. When two Blocks have been clicked on there is a success highlight if the Blocks match and a failure highlight if they do not. If there is a match the matched Blocks are no longer interactable and remain highlighted. If it is failure the failure highlights will be cleared when the user interacts with any of Blocks again. The game ends when there are not enough Pairs for another round.

### Unused

The other game has Concepts and related Extensions extracted from the resources. A Concept is an AI summarized high level concept from the resources. An Extension is an AI summarized sentence from the resource that is related to the Concept. Each concept should have 4 Extensions. The game is played in rounds. 2 Concepts are randomly selected and displayed to the User for a round of the game. The concepts are displayed as columns with the text content of the concept as the header of the column. The Extensions for the concepts are randomly sorted into a list and displayed to the User one at a time as blocks. The blocks have the Extension sentence inside as text. The User drags the block to one of the columns. If the Concept of the column matches the Extension of the block, the block is added to the column and the block is given a success highlight. If there is not a match the block is added to the matching column with a failure highlight. Once blocks are added to a column they are not interactable and the next block is displayed.

## Codex Prompt

Build a web app for playing a math proof game to learn math topics. Cost is a concern.

PlayProver is the name of the app. Implement a proof game based on "Proof Blocks". An html file with two example proofs and pdf of the paper describing "Proof Blocks" are provided.

A hiden part of the app allows an admin to create and manage the available proofs to play in the proof game. The admin inputs a text description of math and name for the proof. An AI processes the text to create input to the proof game. The admin can then play the proof game for the input and approve or reject it.

The approved proofs appear as a list of names on the home page of the app. An anonymous user can vist this page and select from one of the available proofs to play the proof game.

## Process

Give prompt to agents and develop iteratively with them, specifically avoid providing architecture choices up front to see the preferences each model has. Try to plan and reduce token costs.
