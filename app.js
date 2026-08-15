import React from 'react';

export default class App extends React.Component {
  render() {
    return (
      <div
        className="app-container"
        style={{ backgroundColor: 'blue', color: 'white', padding: '10px' }}
      >
        <h1>Welcome to My App</h1>
        <p>This is a paragraph.</p>
      </div>
    );
  }
}
