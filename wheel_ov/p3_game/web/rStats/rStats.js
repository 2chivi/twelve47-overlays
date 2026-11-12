
class Stats extends React.Component {

    constructor() {
        super();
        var t = this;
        t.state = {
            FPS: 0, Cycle: 0, Ping: 0, Acc: 0, Render: 0,
        };

        setInterval(function(){
            if (CN.Ping_) {
                t.setState({
                    Ping: CN.Ping_,
                    Cycle: G.cycleAvg.toFixed(2),
                    ServerCycle: CN.ServerCycle ? CN.ServerCycle.toFixed(2) : 0,
                    Acc: G.acc_.toFixed(2),
                    Render: G.renderAvg.toFixed(2),
                    IQR: (CN.IncomingIQR + CN.OutgoingIQR).toFixed(2)
                });
            }
        }, 2000);
    }

    render() {
        var t = this;
        var danger = { color: '#ff8282' };
        var show = { display: 'block' };
        
        var stuff = <div>
            <div className='Stats' style={this.state.style}>

                <div style={t.state.Ping > 90 ? danger : null}>PING: {t.state.Ping}</div>
                <div style={t.state.IQR > 20 ? danger : null}>IQR: {t.state.IQR}</div>
                <div style={t.state.Render > 8 ? danger : null}>Render: {t.state.Render}</div>
                <div style={t.state.Cycle > 8 ? danger : null}>Engine: {t.state.Cycle}</div>
                <div style={t.state.ServerCycle > 15 ? danger : null}>Server: {t.state.ServerCycle}</div>
                <div style={t.state.Acc > 35 ? danger : null}>Acc: {t.state.Acc}</div>

            </div>
            <div className='Warnings' style={this.state.style}>

                <div style={CN.ServerBehind ? show : null}>Server Issues</div>
                <div style={CN.NetworkIssues ? show : null}>Network Issues</div>
                <div style={G.EngineBehind ? show : null}>CPU Warning</div>
                <div style={G.RenderBehind ? show : null}>GPU Warning</div>
            </div>
        </div>;

        return stuff;
    }
}