
<img align=left src="https://user-images.githubusercontent.com/9025925/51088510-e05cfb00-1760-11e9-8f62-4e7e47240754.png"/>

# 9Stats
A byproduct of the blog bost "Getting tired of re-uploads, Dismantling 9Gag with perceptual image hashing" demonstrating how duplicates 
and reuploads of 9Gag could be prevented using <a href="https://github.com/KilianB/JImageHash">JImageHash</a> 

The extension removes a lot of clutter and shows the __upvote__ for posts even if they are voted masked (new posts in fresh).

Additionally the __downvote__ count is displayed which was originally shown on 9gag, but has since been hidden in the official version.

![examplebrowserextension](https://user-images.githubusercontent.com/9025925/51088581-b8ba6280-1761-11e9-9669-536f0be2c2ca.jpg)

When finding similar bug like these I usually resort to get them fixed silently. Due to the unseverity of this leak, this may serve as a
friendly reminder to the 9gag dev team that it has never been a good idea to send info to the client they are not supposed to see. 

## Usage
Install <a href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=de">tapermonkey (chrome tested)</a> or 
<a href="https://addons.mozilla.org/de/firefox/addon/greasemonkey/">greasmonkey (firefox)</a>, download the js file in this repository and install the
script by clicking new script and copy pasting the content into the window.
This method only works for the front page.

The following settings may be adjutsed in the file if you don't want to hide the clutter. I just couldn't bare it and added it out of convinience

````Javascript
var removeTopAdds = true;
var hideRightFeaturedPosts = true;
var hideSections = true;
var hideHeader = true;
var hideTopTags = true;
````

## Disclaimer 
This is more of a proof of concept application written in 15 minutes instead of a full supported well tested code. My javascript is subpar so anyone feel free and improve it any way you like (GPL!).
