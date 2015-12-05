# Overview

Have you ever wondered what users say about your iOS app? Install the `slack-app-reviews` Slack command and wonder no more. It's as simple as typing `/appreview` in any of your Slack channels.
For now, a random review from one of your configured apps is displayed.

# SaaS

`slack-app-reviews` are available to any Slack team, no need to install or deploy anything.

## Create the Slack command

This is a one-time setup and takes less than 5 minutes:

1. Navigate to https://your-team-name.slack.com/services/new/slash-commands where `your-team-name` is your Slack team name.
1. Choose a command: `/appreview`
1. URL: https://slack-app-reviews.herokuapp.com/app-review
1. Method: POST
1. Fill in the rest of the form as you see fit
1. Click **Save Integration**

## Configuration

In any Slack channel, type `/appreview` and follow the instructions.

## Help

Use `/appreview help` to see what commands are available.

# Host it by yourself

You can clone this repository and host the code on your own.

## Requirements

* Install `node`
* Create a www.parse.com account

## Installation

`npm install`

## Configuration

See `config.json`.
* Adjust the `maxRating`. Default: 5 (all reviews)

Parse
* Set the following environment variables:
 * PARSE_APP_ID: Application ID
 * PARSE_APP_KEY: JavaScript Key
* You can find these values under Settings / Keys in your Parse account

## Run

`node index.js`
