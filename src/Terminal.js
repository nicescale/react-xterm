import React from 'react';
import {findDOMNode} from 'react-dom';
import Xterm from 'xterm';
import 'xterm/addons/fit/fit.js';
import 'xterm/addons/attach/attach.js';
import 'xterm/addons/fullscreen/fullscreen.js';
import io from 'socket.io-client';

export default class Terminal extends React.Component {
  static propTypes = {
    socketURL: React.PropTypes.string.isRequired,
    type: React.PropTypes.string,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    onError: React.PropTypes.func,
    onClose: React.PropTypes.func
  }

  constructor(props) {
    super(props);
    this.term = new Xterm({cursorBlink: true});
    this.path = props.socketURL || props.query.socketURL;
    this.socket = this.createSocket();
    this.handleResize = this.handleResize.bind(this);
  }

  createSocket() {
    const {onError, onClose} = this.props;
    const socket = io({path: this.path, reconnection: false});
    socket.on('error', (err) => {
      console.error('terminal socket error:', err);
      onError && onError();
      this.close();
    });
    socket.on('disconnect', () => {
      this.close();
      onClose && onClose();
      if (parent.window) {
        parent.window.postMessage('terminal:destroy', window.location.origin);
      }
      window.close();
    });
    return socket;
  }

  close() {
    this.term.destroy();
    this.socket.close();
  }

  handleResize() {
    const size = this.viewport();
    this.socket.emit('resize', `${size.cols},${size.rows}`,
      () => this.term.resize(size.cols, size.rows));
  }

  viewport() {
    const terminalContainer = findDOMNode(this);
    const width = this.props.width || (terminalContainer ? terminalContainer.clientWidth : 0);
    const height = this.props.height || (terminalContainer ? terminalContainer.clientHeight : 0);
    return {
      cols: parseInt(width / 7, 10),
      rows: parseInt(height / 14, 10)
    };
  }

  componentWillMount() {
    if (!this.path) {
      this.close();
    }
  }

  componentDidMount() {
    const terminalContainer = findDOMNode(this);
    const {term, socket} = this;
    const size = this.viewport();
    socket.emit('auth', `terminal,${size.cols},${size.rows}`);
    term.open(terminalContainer);
    term.fit();
    this.props.query && term.toggleFullscreen();
    term.write('\x1b[32mWelcome to use cSphere online terminal!\x1b[m\r\n');
    term.on('data', (data) => {
      socket.emit('data', data);
    });

    socket.on('data', (data) => {
      term.write(data);
    });

    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    this.close();
    window.removeEventListener('resize', this.handleResize);
  }

  render() {
    return (
      <div id="terminal-container" />
    );
  }
}

Terminal.defaultProps = {
  width: 0,
  height: 0
};
