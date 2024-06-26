(function(){

  
/////https://chriscavs.github.io/bounds-demo///////////
////library slightly changed ... usecase intersectiobObserver ///////////
const checkForObserver = () => {
  if (!("IntersectionObserver" in window)) {
    throw new Error(`
      bounds.js requires IntersectionObserver on the global object.
      IntersectionObserver is unavailable in IE and other older
      versions of browsers.
      See https://github.com/ChrisCavs/bounds.js/blob/master/README.md
      for more compatibility information.
    `);
    return false;
  }
  return true;
};

const getMargins = (margins = {}) => {
  const { top = 0, right = 0, bottom = 0, left = 0 } = margins;
  return `${top}px ${right}px ${bottom}px ${left}px`;
};

const noOp = () => {};

const Bound = options => {
  return new Boundary(options);
};

class Boundary {
  constructor({ root, margins, threshold, onEmit } = {}) {
    //checkForObserver();
    const marginString = getMargins(margins);
    const options = {
      root: root || null,
      rootMargin: marginString,
      threshold: threshold || 0.0
    };
    this.nodes = [];
    this.onEmit = onEmit || noOp;
    this.observer = new IntersectionObserver(this._emit.bind(this), options);
  } // API

  watch(el, onEnter = noOp, onLeave = noOp) {
    const data = {
      el,
      onEnter,
      onLeave
    };
    this.nodes.push(data);
    this.observer.observe(el);
    return data;
  }

  unWatch(el) {
    const index = this._findByNode(el, true);

    if (index !== -1) {
      this.nodes.splice(index, 1);
      this.observer.unobserve(el);
    }

    return this;
  }

  check(el) {
    const data = this._findByNode(el) || {};
    return data.history;
  }

  clear() {
    this.nodes = [];
    this.observer.disconnect();
    return this;
  }

  static checkCompatibility() {
    checkForObserver();
  } // HELPERS

  _emit(events) {
    const actions = events.map(event => {
      const data = this._findByNode(event.target);

      const ratio = event.intersectionRatio;
      data.history = event.isIntersecting;
      event.isIntersecting ? data.onEnter(ratio) : data.onLeave(ratio);
      return {
        dropTargetEl: document.getElementById(this.dropTargetId),
        el: event.target,
        inside: event.isIntersecting,
        outside: !event.isIntersecting,
        ratio: event.intersectionRatio
      };
    });
    this.onEmit(actions);
  }

  _findByNode(el, returnIndex = false) {
    const func = returnIndex ? "findIndex" : "find";
    return this.nodes[func](node => {
      return node.el.isEqualNode(el);
    });
  }
} /////end of bounds///////////////////////////////////
//////unloading event////////////////////////////////

function unloadDragDrop(hypeDocument, element, event) {
  Object.values(hypeDocument.customData.boundsInstances).forEach(
    boundsInstance => {
      boundsInstance.clear();
    }
  );
  hypeDocument.customData.boundsInstances = {};
  window.removeEventListener(
    "resize",
    hypeDocument.customData.initInterSectionObservers
  );
  element.removeEventListener(
    "touchstart",
    hypeDocument.customData.handleDragStartAndDragEnd
  );
  element.removeEventListener(
    "mousedown",
    hypeDocument.customData.handleDragStartAndDragEnd
  );
  element.removeEventListener(
    "touchend",
    hypeDocument.customData.handleDragStartAndDragEnd
  );
  element.removeEventListener(
    "mouseup",
    hypeDocument.customData.handleDragStartAndDragEnd
  );
} ///////end unloading//////////////////////////////////////

function dragDrop(hypeDocument, element, event) {
  const handleDragStartAndDragEnd = (hypeDocument.customData.handleDragStartAndDragEnd = function(
    event
  ) {
    const dragTargetEl = event.target;

    if (dragTargetEl.dataset.drag) {
      //
      if (event.type === "mousedown" || event.type === "touchstart") {
        hypeDocument.setElementProperty(dragTargetEl, "z-index", zIndex++);
        activeDragTarget = dragTargetEl;
        if (dragTargetEl.dataset.dragreverse === 'true') {
          setTimeout(function(){storeProperties(dragTargetEl, dragTargetEl.id)},1);
        }
      } //

      if (event.type === "mouseup" || event.type === "touchend") {
        if (lastAction.inside) {
          activeDragTarget = null;
          if(dragTargetEl.dataset.dropsnap === 'true'){
          setTimeout(function() {
          storeProperties(lastAction.dropTargetEl, dragTargetEl.id);
          resetProperties(dragTargetEl, dragTargetEl.id);
          }, 1);
           }

           const custombehaviorNameToTrigger = lastAction.dropTargetEl.dataset.dropcustombehavior;
          if (custombehaviorNameToTrigger) {
            console.log("source drop, custombehaviorNameToTrigger: " + custombehaviorNameToTrigger);
            hypeDocument.triggerCustomBehaviorNamed(
              custombehaviorNameToTrigger
            );
          }

          lastAction.inside = false;

          solvedPuzzlePieses.add(dragTargetEl.id);
          checkForFinish();

        } else {
          if (dragTargetEl.dataset.dragreverse === 'true') {
            setTimeout(function() {
              resetProperties(dragTargetEl, dragTargetEl.id);
            }, 1);
          }
        }
      }
    } //
  }); ///
  /////

  function initListenersForDrag(currSceneEl) {
    currSceneEl.addEventListener("touchstart", handleDragStartAndDragEnd);
    currSceneEl.addEventListener("mousedown", handleDragStartAndDragEnd);
    currSceneEl.addEventListener("touchend", handleDragStartAndDragEnd);
    currSceneEl.addEventListener("mouseup", handleDragStartAndDragEnd);
  } /////

  function storeProperties(element, key) {
    storedDragTargetProperties[key] = {};
    storedDragTargetProperties[key].left = hypeDocument.getElementProperty(
      element,
      "left"
    );
    storedDragTargetProperties[key].top = hypeDocument.getElementProperty(
      element,
      "top"
    );
   
  } /////

  function resetProperties(element, key) {
    hypeDocument.setElementProperty(
      element,
      "left",
      storedDragTargetProperties[key].left,
      0.15,
      "easeinout"
    );
    hypeDocument.setElementProperty(
      element,
      "top",
      storedDragTargetProperties[key].top,
      0.15,
      "easeinout"
    );
    
  } /////

  function initDropTargetMutationObserver(dropTarget) {
    hypeDocument.startMutationObserver(
      dropTarget,
      function(mutation) {
        Object.keys(boundsInstances).forEach(observerInstanceKey => {
          if (
            boundsInstances[observerInstanceKey]["dropTargetId"] ===
            dropTarget.id
          ) {
            const dragTarget = hypeDocument.getElementById(
              boundsInstances[observerInstanceKey]["dragTargetId"]
            );
            boundsInstances[observerInstanceKey].clear();
            setInterSectionObserver([dragTarget, [dropTarget]]);
          }
        });
      },
      {
        id: dropTarget.id,
        updaterate: 2,
        attributes: true,
        attributeFilter: ["style"]
      }
    );
  } /////

  const initInterSectionObservers = (hypeDocument.customData.initInterSectionObservers = function() {
    setTimeout(function() {
      dragnDropPairs.forEach(function(dragDropPair) {
        setInterSectionObserver(dragDropPair);
      });
    }, 1);
  }); /////

  function filldragnDropPairs(dragEls) {
    dragEls.forEach(function(dragEl) {
    
      if(dragEl.dataset.onpuzzlesolved){onpuzzlesolved = dragEl.dataset.onpuzzlesolved;}

      const _dropClasses = dragEl.dataset.drop.split(" | ");

      const dropEls = getDropEls(_dropClasses);
      dragnDropPairs.push([dragEl, dropEls]);
    });
  } /////

  function getDropTargetMargins(dropTarget, SceneEl) {
    const margins = {};
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const dropTargetViewportCoords = dropTarget.getBoundingClientRect();
    const dropTargetTop = dropTargetViewportCoords.top + scrollTop;
    const dropTargetLeft = dropTargetViewportCoords.left + scrollLeft;
    const dropTargetRight = dropTargetViewportCoords.right + scrollLeft;
    const sceneViewportCoords = SceneEl.getBoundingClientRect();
    const sceneTop = sceneViewportCoords.top + scrollTop;
    const sceneLeft = sceneViewportCoords.left + scrollLeft;
    const sceneRight = sceneViewportCoords.right + scrollLeft;
    margins.left = Math.abs(dropTargetLeft - sceneLeft) * -1;
    margins.top = Math.abs(dropTargetTop - sceneTop) * -1;
    margins.bottom =
      Math.abs(
        sceneViewportCoords.height -
          dropTargetViewportCoords.height -
          dropTargetTop
      ) * -1;
    margins.right = Math.abs(dropTargetRight - sceneRight) * -1;
    return margins;
  } /////

  function setInterSectionObserver(dragDropPair) {
    const dragTarget = dragDropPair[0];
    const dropTargets = dragDropPair[1];

if(dropTargets.length === 0){
  console.log('No droptargets for ' + dragTarget.id)
  return
};

    dropTargets.forEach(function(dropTarget) {
      const observerInstanceKey = dropTarget.id + " | " + dragTarget.id;

      if (boundsInstances[observerInstanceKey]) {
        boundsInstances[observerInstanceKey].clear();
      }

      const margins = getDropTargetMargins(dropTarget, currSceneEl);
      boundsInstances[observerInstanceKey] = Bound({
        root: currSceneEl,
        margins: margins,
        threshold: 0.15,
        onEmit: actions => {
          if (actions.some(action => action.inside)) {
            const currIntersection = actions[0];
            if(currIntersection.el === activeDragTarget){
            const custombehaviorNameToTrigger = currIntersection.dropTargetEl.dataset.intersectcustombehavior;
            console.log("source intersection, custombehaviorNameToTrigger: " + custombehaviorNameToTrigger);
            hypeDocument.triggerCustomBehaviorNamed(
              custombehaviorNameToTrigger
            );
            }
          };
          if (actions.some(action => action.outside)) {
            const currIntersection = actions[0];
            if(currIntersection.el === activeDragTarget){
            const custombehaviorNameToTrigger = currIntersection.dropTargetEl.dataset.intersectoffcustombehavior;
            console.log("source intersectionoff, custombehaviorNameToTrigger: " + custombehaviorNameToTrigger);
            hypeDocument.triggerCustomBehaviorNamed(
              custombehaviorNameToTrigger
            );
          }
          }
          lastAction = actions[0]; 
        }
      });
      boundsInstances[observerInstanceKey].watch(dragTarget);
      boundsInstances[observerInstanceKey]["dropTargetId"] = dropTarget.id;
      boundsInstances[observerInstanceKey]["dragTargetId"] = dragTarget.id;
      initDropTargetMutationObserver(dropTarget);
    });
  } /////

  function getDragEls() {
    const dragEls = [...currSceneEl.querySelectorAll("[data-drag]")];
    return dragEls;
  } /////

  function getDropEls(ArrayOfClasses) {
    let tmpArr = [];
    ArrayOfClasses.forEach(function(cssClass) {
      tmpArr.push([...currSceneEl.querySelectorAll("." + cssClass)]);
    });
    return [].concat(...tmpArr);
  } /////

  function pointerEventsNoneToDragElChildNodes(dragEls) {
    dragEls.forEach(function(dragEl) {
      const allChildNodes = [...dragEl.getElementsByTagName("*")];
      allChildNodes.forEach(function(node) {
        node.style.pointerEvents = "none";
      });
    });
  } 
  
  function checkForFinish(){
    const solvedLength = solvedPuzzlePieses.size;
    if(solvedLength === Object.keys(boundsInstances).length){
      if(onpuzzlesolved){
      hypeDocument.triggerCustomBehaviorNamed(
        onpuzzlesolved
      );
    }
    }
  };

  //global

  const currSceneEl = document.getElementById(hypeDocument.currentSceneId());
  const dragnDropPairs = []; //[[targetE, [dropel, dropel, ...]], ..]

  const boundsInstances = (hypeDocument.customData.boundsInstances = {});
  let lastAction = null;
  const storedDragTargetProperties = {};
  let zIndex = 999; 
  let activeDragTarget = null;
  let onpuzzlesolved = null;
  const  solvedPuzzlePieses = new Set();

  
  //////////////////////////main thread///////////

  const dragEls = getDragEls(); //

  if(!checkForObserver()){return};


  pointerEventsNoneToDragElChildNodes(dragEls); //

  filldragnDropPairs(dragEls);
  
  initInterSectionObservers(); //

  initListenersForDrag(currSceneEl); //

  window.addEventListener("resize", initInterSectionObservers);
}

if ("HYPE_eventListeners" in window === false) {
  window.HYPE_eventListeners = Array();
}

window.HYPE_eventListeners.push({
  type: "HypeSceneLoad",
  callback: dragDrop
});
window.HYPE_eventListeners.push({
  type: "HypeSceneUnload",
  callback: unloadDragDrop
});

})()