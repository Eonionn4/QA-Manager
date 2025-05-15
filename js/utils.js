// Firebase initialization (TOP OF utils.js)
const firebaseConfig = {
  apiKey: "AIzaSyBHbW2URJhucqa6cwCfodmhwkXhKMcDky0",
  authDomain: "reliability-program.firebaseapp.com",
  projectId: "reliability-program",
  storageBucket: "reliability-program.appspot.com",
  messagingSenderId: "954792974445",
  appId: "1:954792974445:web:7b39d5a876300167d68764",
  measurementId: "G-BES706G2PR"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Save data array to localStorage
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  // Load data array from localStorage
  function loadData(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  
  // Add item to array in localStorage
  function addItem(key, item) {
    const data = loadData(key);
    data.push(item);
    saveData(key, data);
  }
  
  // Delete item by ID from localStorage array
  function deleteDataById(key, id) {
    const data = loadData(key).filter(item => item.id !== id);
    saveData(key, data);
  }
  
  // General function to clear an element's innerHTML
  function clearElement(elementId) {
    document.getElementById(elementId).innerHTML = '';
  }
  
  // Create HTML elements from array of objects and append using a template
  function renderList(elementId, dataArray, templateFunction) {
    const fragment = document.createDocumentFragment();
    dataArray.forEach(data => {
      const htmlString = templateFunction(data);
      const div = document.createElement('div');
      div.innerHTML = htmlString.trim();
      fragment.appendChild(div.firstChild);
    });
    document.getElementById(elementId).appendChild(fragment);
  }
  
  // Centralized Drag & Drop handlers
  function setupDragAndDrop(draggableSelector, dropZoneSelector, onDropCallback) {
    document.querySelectorAll(draggableSelector).forEach(item => {
      item.setAttribute('draggable', true);
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', item.dataset.id);
      });
    });
  
    document.querySelectorAll(dropZoneSelector).forEach(zone => {
      zone.addEventListener('dragover', e => e.preventDefault());
      zone.addEventListener('drop', onDropCallback);
    });
  }
  
  // Simple validation utility
  function validateInputs(inputs) {
    return inputs.every(input => input.value.trim() !== '');
  }
  