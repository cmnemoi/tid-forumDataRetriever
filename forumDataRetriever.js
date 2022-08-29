// ==UserScript==
// @name         ForumDataRetriever
// @version      3.0.0
// @description  Retrieve twinoid forums data into JSON Format
// @author       Sanart
// @updateURL   https://raw.githubusercontent.com/Sanart99/tid-forumDataRetriever/master/forumDataRetriever.js
// @downloadURL https://raw.githubusercontent.com/Sanart99/tid-forumDataRetriever/master/forumDataRetriever.js
// @include  https://twinoid.com/tid/forum*
// @include https://twinoid.com/fr/tid/forum*
// @include http://www.hordes.fr/tid/forum*
// @include http://www.die2nite.com/tid/forum*
// @include http://www.dieverdammten.de/tid/forum*
// @include http://www.zombinoia.com/tid/forum*
// ==/UserScript==

var maxPages = undefined;
var mainDisplay = 'askToShowInterface';

function startFDR(nPages) {
    var threadElements = undefined;
    var threadIDs = [];
    var threadPos = 0;

    var jsonData = '{\n"topics": [{\n\t';

    var forumRPageNumber = 1;
    var nPageThreadsScanned = 0;

    var forumRElement = document.getElementById("tid_forum_right");
    maxPages = nPages;

    // Reads a page of threads
    function scanThreads() {
        if (maxPages == undefined) maxPages = parseInt(document.getElementById("fdr-maxPages").value);
        if (isNaN(maxPages)) { console.log("[ForumDataRetriever] maxPages is NaN."); return; }
        
        if (_tid.forum.urlLeft.indexOf("?p=") == -1) _tid.forum.loadLeft(_tid.forum.urlLeft+"?p=1");

        updateStatus("Pages fetched : " + nPageThreadsScanned + " (Max : " + maxPages + ")");

        threadElements = document.getElementsByClassName("tid_thread tid_threadLink");
        threadIDs = [];
        threadPos = 0;
        forumRPageNumber = 1;
        for (var i = 0; i < threadElements.length; i++) {
            var attr = threadElements[i].getAttribute("id");
            threadIDs.push(attr.split("_")[2]);
        }

        new MutationObserver(function (mutList, observer) {
            for(var mutation of mutList) {
                if (mutation.type == 'childList') {
                    var removedNode = mutation.removedNodes[0];
                    if (removedNode !== undefined && removedNode.className === "tid_loading") {
                        observer.disconnect();
                        scanThread();
                    }
                }
            }
        }).observe(forumRElement, { childList: true });

        _tid.forum.loadRight("thread/"+threadIDs[threadPos]+"?p=1", { side : "R"});
    }

    // Reads current loaded thread header, then reads all comments in thread
    function scanThread() {
        var thrCommsPageLoadTimestamp = Date.now(); // threadCommentsPageLoadTimestamp
        var commentCount = 0;
        var topicName = document.querySelector("#tid_forum_right .tid_title").innerHTML.trim();
        topicName = topicName.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g,'').replace(/\t/g,'');

        var thrStates = "";
        function addThrStates(state) {
            if (thrStates.length != 0) thrStates += ",";
            thrStates += '"'+state+'"';
        }
        var thrElement = document.querySelector(".tid_thread.tid_selected");
        if (thrElement.classList.contains("tid_hidden")) addThrStates('hidden');
        if (document.querySelector("#tid_forum_right .tid_threadNotice.tid_lock") != undefined) addThrStates('locked');
        if (document.querySelector("#tid_forum_right .tid_threadNotice.tid_adminAnnounce") != undefined) addThrStates('adminAnnounce');
        if (document.querySelector("#tid_forum_right .tid_threadNotice.tid_announce") != undefined) addThrStates('announce');
        
        jsonData += '"name":"'+topicName+'",\n\t';
        jsonData += '"id":'+threadIDs[threadPos]+',\n\t';
        jsonData += '"pages":'+forumRPageNumber+',\n\t';
        jsonData += '"states":['+thrStates+'],\n\t';
        jsonData += '"comments":[';
        
        // Reads thread comments
        function scanThreadComments() {
            var pagePosts = document.getElementsByClassName("tid_post");

            var e = document.querySelectorAll("#tid_forum_right .tid_mainBar .tid_next a")[0];
            var nextCommentsPage = (e === undefined) ? undefined : e.toString().split("=")[2];

            for (var i = 0; i < pagePosts.length; i++) {
                var commentID = parseInt(pagePosts[i].id.substr(14));
                if (document.querySelector("#tid_forumPost_"+commentID+" .tid_name a") === undefined) {
                    continue;
                }
                
                var postAuthor = document.querySelector("#tid_forumPost_"+commentID+" .tid_name a").toString().split("/")[5];
                var postDate = document.querySelector("#tid_forumPost_"+commentID+" .tid_date").innerHTML;
                var res = document.querySelectorAll("#tid_forumPost_"+commentID+" .tid_editorContent");
                var postContent = res[0].innerHTML;
                var postWarning = res[1] == undefined ? undefined : res[1].innerHTML;
                postContent = postContent.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\u{2028}|\u{2029}/gu, '').replace(/\r\n/g,'<br />').replace(/\n/g,'\\n');
                if (postWarning != undefined)
                    postWarning = postWarning.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\u{2028}|\u{2029}/gu, '').replace(/\r\n/g,'<br />').replace(/\n/g,'\\n'); // replaces copypasted
                commentCount++;

                var commElement = document.querySelector("#tid_forumPost_"+commentID);
                var commStates = "";
                function addCommStates(state) {
                    if (commStates.length != 0) commStates += ",";
                    commStates += '"'+state+'"';
                }
                if (commElement.classList.contains("tid_hidden")) addCommStates('hidden');
                if (commElement.classList.contains("tid_niceHidden")) addCommStates('niceHidden');
                if (commElement.classList.contains("tid_modReplaced")) addCommStates('modReplaced');

                jsonData += commentCount == 1 ? '\n\t\t{\n\t\t\t' : ',\n\t\t{\n\t\t\t';
                jsonData += '"authorID":'+postAuthor+',\n\t\t\t';
                jsonData += '"id":'+commentID+',\n\t\t\t';
                jsonData += '"displayedDate":"'+postDate+'",\n\t\t\t'; // Date displayed
                jsonData += '"loadTimestamp":'+thrCommsPageLoadTimestamp+',\n\t\t\t'; // Timestamp of when the page finished loading
                jsonData += '"deducedDate":"'+deduceDate(postDate,thrCommsPageLoadTimestamp)+'",\n\t\t\t'; // Deduced timestamp of the comment
                jsonData += '"states":['+commStates+'],\n\t\t\t';
                jsonData += '"content":"'+postContent+'",\n\t\t\t';
                jsonData += '"contentWarning":' + (postWarning == undefined ? 'null' : '"'+postWarning+'"') + '\n\t\t';
                jsonData += "}";
            }


            if (isNaN(nextCommentsPage)) {
                jsonData += '],\n\t';
                jsonData += '"commentsCount":'+commentCount;
                forumRPageNumber = 1;

                // if on last thread of thread page
                if (threadPos+1 == threadIDs.length) {
                    nPageThreadsScanned++;

                    function reachedEnd() {
                        console.log(jsonData+'\n\t}\n]}');
                        updateStatus("Pages fetched : " + nPageThreadsScanned + ". Result is logged into console.");
                    }

                    if (maxPages == nPageThreadsScanned) {
                        reachedEnd();
                        return;
                    }

                    // if next thread page exists
                    var e = document.querySelectorAll("#tid_forum_left .tid_actionBar .tid_next a")[0];
                    if (e !== undefined && e.toString().split("=")[1] !== undefined) {
                        var nextThreadsPage = e.toString().split("=")[1].split("|")[0];
                        if (maxPages == nPageThreadsScanned) 

                        updateStatus("Pages fetched : " + nPageThreadsScanned + " (Max : " + maxPages + ")");

                        jsonData += '\n\t},\n\t{\n\t';

                        // scanThreads starts when next page of threads loaded
                        new MutationObserver(function(mutList, observer) {
                            for(var mutation of mutList) {
                                if (mutation.type == 'childList') {
                                    var node = mutation.removedNodes[0];
                                    if (node !== undefined && node.className === "tid_loading") {
                                        observer.disconnect();
                                        scanThreads();
                                    }
                                }
                            }
                        }).observe(document.getElementById("tid_forum_left"), { childList: true });

                        _tid.forum.loadLeft(_tid.forum.urlLeft.split("?")[0]+"?p="+nextThreadsPage);
                    }
                } else {
                    // scanThread starts when next thread loads
                    new MutationObserver(function(mutList, observer) {
                        for(var mutation of mutList) {
                            if (mutation.type == 'childList') {
                                var node = mutation.removedNodes[0];
                                if (node !== undefined && node.className === "tid_loading") {
                                    observer.disconnect();
                                    scanThread();
                                }
                            }
                        }
                    }).observe(forumRElement, { childList: true });

                    jsonData += '\n\t},\n\t{\n\t';
                    _tid.forum.loadRight("thread/"+threadIDs[++threadPos]+"?p=1");
                }
            } else {
                forumRPageNumber++;

                // scanThreadComments starts when next page of comments loaded
                new MutationObserver(function(mutList, observer) {
                    for(var mutation of mutList) {
                        if (mutation.type == 'childList') {
                            var node = mutation.removedNodes[0];
                            if (node !== undefined && node.className === "tid_loading") {
                                observer.disconnect();
                                scanThreadComments();
                            }
                        }
                    }
                }).observe(forumRElement, { childList: true });
                _tid.forum.loadRight("thread/"+threadIDs[threadPos]+"?p="+nextCommentsPage);
            }
        }
        scanThreadComments();
    }

    scanThreads();
}

var fdrMainElement = undefined;

function switchMainDisplayToStatus() {
    fdrMainElement = document.getElementById("fdr-main");
    fdrMainElement.innerHTML = "Pages fetched : 0";
    mainDisplay = "status";
}

function updateStatus(msg) {
    if (mainDisplay != "status" || fdrMainElement == undefined) return;
    fdrMainElement.innerHTML = msg;
}

function deduceDate(displayedDate, loadTimestamp) {
    var loadDate = new Date(loadTimestamp+(1000*3600*2)); // at UTC+2
    var spl = displayedDate.split(" ");
    var sDate = "";

    switch (spl[0]) {
        case "Le":
            sDate = (spl[3] != undefined) ? spl[3] : loadDate.getUTCFullYear();
            switch(spl[2]) {
                case "janvier": sDate += "-01"; break;
                case "février": sDate += "-02"; break;
                case "mars": sDate += "-03"; break;
                case "avril": sDate += "-04"; break;
                case "mai": sDate += "-05"; break;
                case "juin": sDate += "-06"; break;
                case "juillet": sDate += "-07"; break;
                case "août": sDate += "-08"; break;
                case "septembre": sDate += "-09"; break;
                case "octobre": sDate += "-10"; break;
                case "novembre": sDate += "-11"; break;
                case "décembre": sDate += "-12"; break;
                default: console.log("[ForumDataRetriever] Unknown month: '" + spl[2] + "'"); return undefined;
            }
            
            sDate += "-"+spl[1];
            break;
        case "Lundi": case "Mardi": case "Mercredi": case "Jeudi": case "Vendredi": case "Samedi": case "Dimanche":
            var todayDay = loadDate.getUTCDay();
            var postDay = -1;
            switch (spl[0]) {
                case "Dimanche": postDay = 0; break;
                case "Lundi": postDay = 1; break;
                case "Mardi": postDay = 2; break;
                case "Mercredi": postDay = 3; break;
                case "Jeudi": postDay = 4; break;
                case "Vendredi": postDay = 5; break;
                case "Samedi": postDay = 6; break;
            }
            var diff;
            if (todayDay == postDay) diff = 0; 
            else if (todayDay > postDay) diff = postDay - todayDay;
            else diff = -((todayDay+7) - postDay);

            var postDate = new Date(loadDate);
            postDate.setUTCDate(loadDate.getUTCDate()+diff);
            var m = postDate.getUTCMonth()+1;
            var sMonth = (m < 10) ? "0"+m : m;
            sDate = postDate.getUTCFullYear()+"-"+sMonth+"-"+postDate.getUTCDate();
            break;
        case "Hier":
            var postDate = new Date(loadDate);
            postDate.setUTCDate(loadDate.getUTCDate()-1);
            var m = postDate.getUTCMonth()+1;
            var sMonth = (m < 10) ? "0"+m : m;
            sDate = postDate.getUTCFullYear()+"-"+sMonth+"-"+postDate.getUTCDate();
            break;
        case "Aujourd'hui":
            var postDate = new Date(loadDate);
            var m = postDate.getUTCMonth()+1;
            var sMonth = (m < 10) ? "0"+m : m;
            sDate = postDate.getUTCFullYear()+"-"+sMonth+"-"+postDate.getUTCDate();
            break;
        case "Il":
            var postDate = new Date(loadDate);
            switch (spl.length) {
                case 5: postDate.setUTCMinutes(postDate.getUTCMinutes()-parseInt(spl[3])); break;
                case 7:
                    postDate.setUTCHours(postDate.getUTCHours()-parseInt(spl[3]));
                    postDate.setUTCMinutes(postDate.getUTCMinutes()-parseInt(spl[5]));
                    break;
                default: console.log("[ForumDataRetriever] displayedDate parsing failed: '" + spl[2] + "'"); return "???";
            }
            var m = postDate.getUTCMonth()+1;
            var sMonth = (m < 10) ? "0"+m : m;
            sDate = postDate.getUTCFullYear()+"-"+sMonth+"-"+postDate.getUTCDate();
            break;
        default:
    }

    return sDate;
}

window.onload = function () {
    document.addEventListener('click', function (e) {
        if (e.target == document.getElementById("fdr-go")) {
            switchMainDisplayToStatus();
            startFDR();
        }
        else if (e.target == document.getElementById("fdr-a") && document.getElementById("fdr-interface") == undefined) {
            addFDRInterface();
        }
        ;
    });

    function addFDRInterface() {
        var template = document.createElement('template');
        template.innerHTML = `
        <div class="tid_mainBar" id="fdr-interface">
            <div class="tid_stack tid_bg4">
                <span class="tid_title">ForumDataRetriever</span>
            </div>
                
            <div class="tid_actionBar tid_bg4">
                <form>
                    <label for="fdr-maxPages" style="font-size:16px">Pages : </label>
                    <input type="number" id="fdr-maxPages" name="fdr-maxPages" min="1" default="1" style="width:50px">
                </form>
                <div class="tid_buttonBar">
                    <a href="javascript:void(0)" id="fdr-go">Go</a>
                </div>
            </div>
        </div>`.trim();
        var node = template.content.firstChild;
        var e = document.querySelector("#tid_forum_left .tid_forumThreads");
        e.insertBefore(node, e.children[1]);
    }

    var template = document.createElement('template');
    template.innerHTML = `
    <p id="fdr-main" style="margin:auto;text-align:center;"><a href="javascript:void(0)" id="fdr-a">Show ForumDataRetriever Interface</a> </p>`.trim();
    var node = template.content.firstChild;
    var e = document.getElementById("content");
    e.insertBefore(node,e.children[0]);
}