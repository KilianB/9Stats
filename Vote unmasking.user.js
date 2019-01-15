// ==UserScript==
// @name         Vote unmasking
// @namespace    http://github.com/kilianB
// @version      1.0.0
// @description  try to take over the world!
// @author       Kilian
// @match        https://9gag.com/*
// @grant        none
// @copyright (C) 2019 KilianB GPLv3 see https://github.com/KilianB/9Stats for full license
// ==/UserScript==

//Settings
var removeTopAdds = true;
var hideRightFeaturedPosts = true;
var hideSections = true;
var hideHeader = true;
var hideTopTags = true;

//Internal
/** 9Gag api endpoint*/
var base = "https://9gag.com/v1/group-posts/group/default/type/";
/** Token to retrieve the next bit of information from the 9gag endpoint*/
var currentToken;
/** Map saving meta information for each post*/
var postInfo = new Object();
/** current section the user is looking at*/
var section;
/** Prevent race condition when other section is still loading */
var raceLock = 1;

(function() {
    'use strict';

    //Get rid of ads and share buttons ...
    sanetizePage();

    section = extractCurrentSection();

    //prepopulate info
    downloadGagInformation(0,0,raceLock,appendAdditionalInfoToElements);

    // create an observer instance
    var sectionChangeListener = new MutationObserver(function(mutations) {
        //Page gets dynamically reloaded which will result in the start function not being called again.
        //We can detect a reload by listening to changes in the title tag
        section = extractCurrentSection();
        //Increase race lock to symbolize that old in progress requests should be discarded
        // to not overwrite our new clean data objects
        raceLock++;
        postInfo = new Object();
        currentToken = undefined;
        downloadGagInformation(0,0,raceLock,appendAdditionalInfoToElements);
    });

    // configuration of the observer:
    var config = {childList: true };

    // pass in the target node, as well as the observer options
    sectionChangeListener.observe(document.querySelector('title'), config);


    //TODO allow to jump back to last known location. But we are not writing a browser extension here ...
}
)();

/**
* Add an upvote and down vote count to all post images
* which currently do not have any imformation attached to them.
*
* The information is retrieved via syncronous AJAX calls and due to my
* minimal javascript knowledge on how to handle asynch request without
* locks this method uses nested callbacks and fail counters to ensure
* that all elements are updated, failing at some point if the information
* can not be retrieved.
*
* @param recDepth The recursive depth used to propagate retry counts via callbacks
* @param localRaceLoc keep track who issued the request. If it becomes outdates (a new
* request stared after section changed do not update the shared
* object or we loose information.
*/
function appendAdditionalInfoToElements(recDepth,localRaceLock){

    //Attempt the entire procedure twice before failing
    if(recDepth > 2){
        console.log("Could not find info for post abort");
        console.log(postInfo);
        return;
    }

    //add information to the first few posts
    var wrapper = document.getElementById('list-view-2');
    var articles = wrapper.getElementsByTagName("ARTICLE");

    var aborted = false;

    for(var article of articles){

        //Add video container is an article but does not have an id
        if(article.id === ""){
            continue;
        }

        //If we already visited it skip it
        //This can probably be improved by curating a list
        //of elements that need an update instead of retrying everything.
        //Update it in the observer
        if(article.dataset.additionaldata !== "true"){
            if(!appendInfoToArticle(article)){
                aborted = true;
                break;
            }
        }
    }
    cleanUpShareButtons();

    //If failed we attempt to download more information. If we fail again something
    //is wrong and we don't want to keep hitting the server.
    if(aborted){
        downloadGagInformation(0,++recDepth,localRaceLock,appendAdditionalInfoToElements);
    }

}

/*
* Return the current section the user is looking at.
* The section is reflected in the title of the hompage. If the
*
* user navigates to the page the title does not show any section.
* In this case it defaults to hot.
*/
function extractCurrentSection(){
    var currentUrl = window.location.href;
    var needle = ".com/";
    var section = currentUrl.substring(currentUrl.lastIndexOf(needle)+needle.length);
    if(section.length === 0){
        return "hot";
    }
    return section;
}


/*
* Get rid of ads and the clutter as well as registering an observer
* to track page changes
*/
function sanetizePage(){
    //Remove featured page
    if(hideRightFeaturedPosts){
        safeRemoveElem(document.getElementById('sidebar').remove());
    }
    //Remove download app request
    if(removeTopAdds){
        //Remove adds
        safeRemoveElem(document.getElementsByClassName('topBannerAd-container')[0]);
        safeRemoveElem(document.getElementById('jsid-sticky-button'));
    }

    //Remove share buttons

    if(hideSections){
        var sectionWrapper = document.getElementsByClassName('stealthy-scroll-container')[0];
        //Remove footer
        safeRemoveElem(sectionWrapper.getElementsByTagName('SECTION')[2]);
        //Remove sidebar
        safeRemoveElem(sectionWrapper.getElementsByTagName('SECTION')[1]);
        //Keep hot trending and fresh intact
    }

    if(hideTopTags){
        safeRemoveElem(document.getElementsByClassName('featured-tag')[0]);
    }

    if(hideHeader){
        //We could check if style is already present. currently it is not. We can not remove the element
        //Since the 9gag javascript is calling it and it will break the title update of the page which
        //we require to fatch on which section we are.
        document.getElementsByClassName('function-wrap')[0].setAttribute('style','display:none;');

        var navHead = document.getElementsByClassName('nav-menu')[0];
        navHead.innerHTML = "";

    }

    cleanUpShareButtons();
    var observer = new MutationObserver(appendHiddenInformation);

    var targetNode = document.getElementById('list-view-2');
    var config = { childList: true};
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
}

/*
* Safely remove an element.
*/
function safeRemoveElem(e){
    if (typeof e !== 'undefined') {
        e.remove();
    }
}

/**
* Download the information from the endpoint. The AJAX is asynch and since
* synch request are deprecated by xhr we have to use the same ugly callback
* workaround from before. We can't download the next bacth of data before we
* finished downloading the previouse chunk due to the need for the cursor
*/
function downloadGagInformation(recursionDepth,callbackRecDepth,localRaceLock,callback){

    //This method might get called multiple times due to load delays requesting different
    //sections. To prevent overwriting keep track of the id and abort if a newer request
    //is pending.
    if(localRaceLock < raceLock){
        return
    }

    //download a few files at the same time so we have a high probability to
    //get the right data even if the user scrolls quickly
    if(recursionDepth > 5){
        if(callback !== undefined){
            callback(callbackRecDepth,localRaceLock);
        }
        return;
    }

    var url;

    if(currentToken === undefined){
        url = base + section;
    }else{
        url = base + section + "/?"+currentToken;
    }

    getJSON(url,function(_,response){
        currentToken = response.data.nextCursor;
        for(var postEntry of response.data.posts){
          postInfo[postEntry.id] = postEntry;

      }
      recursionDepth++;
      downloadGagInformation(recursionDepth,callbackRecDepth,localRaceLock,callback);
  });
}

/**
* Request new information when ever the state of the side changes
*/
function appendHiddenInformation(mutation){
    if(mutation[0].type=='childList'){
     /*
     Originally desired for individual attributes returned by the observer
     var affectedNodes = mutation[0].addedNodes;
     var newArticles = affectedNodes[0].getElementsByTagName('ARTICLE');

        for(var article of newArticles){
          appendInfoToArticle(article.id);
        }
    }
    */
        downloadGagInformation(0,0,raceLock,appendAdditionalInfoToElements);
    }
}

function appendInfoToArticle(article){
    //Example jsid-post-aZLyAZz
    var id = article.id;
    //aZLyAZz
    var gagId = id.substring(10);

    var getMetaData = postInfo[gagId];

    if(getMetaData == undefined){
        return false;
    }else{
        var p = article.getElementsByClassName('post-meta')[0];
        p.innerText = p.innerText + "  ·  up " + getMetaData.upVoteCount + "  ·  down " + getMetaData.downVoteCount;
        article.setAttribute('data-additionaldata',true);
        return true;
    }
}

/**
* Get rid of all share buttons for facebook and twitter
*/
function cleanUpShareButtons(){
    for(var share of document.getElementsByClassName('share')){
        share.remove()
    }
}

//Greatfully borrow from here https://stackoverflow.com/a/35970894/3244464
function getJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
};
