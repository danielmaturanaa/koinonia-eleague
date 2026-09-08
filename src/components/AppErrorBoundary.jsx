import { Component } from 'react';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error no recuperable de la interfaz', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="fatal-screen" role="alert"><section><p>KOINONIA e-LEAGUE</p><h1>NO PUDIMOS MOSTRAR ESTA PANTALLA</h1><span>La interfaz encontró un error inesperado. Tus datos no fueron modificados.</span><button onClick={() => window.location.reload()}>RECARGAR APLICACIÓN</button></section></main>;
  }
}
