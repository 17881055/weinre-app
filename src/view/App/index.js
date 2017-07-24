import React, { Component } from "react";
import { Layout, Menu, Icon, Breadcrumb, Steps, Spin, notification, Radio, Button, Tag, Card, Alert } from 'antd';
import './style.css';
import { ipcRenderer } from "electron";
import MESSAGE from "../../../src-app/message";

const openNotification = (msg) => {
    notification.open({
        message: 'Notification Title',
        description: msg,
        icon: <Icon type="smile-circle" style={{ color: '#108ee9' }} />,
    });
};

const Step = Steps.Step;
const RadioGroup = Radio.Group;
const { Header, Sider, Content, Footer } = Layout;

export default class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            initNum: 0,
            nodeVersion: "",
            ip: "",
            ipValue: null,
            ipNextButton: true,
            weinre: false,
            loading: true,
            weinreInstallButton: false,
            weinreInstallButtonLoading: false,
            start: false,
            consoleStr: [],
            logStr: []
        };
    }

    componentDidMount() {
        ipcRenderer.send('asynchronous-message', MESSAGE.GET_NODE_INFO);
        ipcRenderer.on('message-log', function (event, type, message) {
            console.log(message)
            this.setState(
                (prevState, props) => {
                    return { logStr: prevState.message + message && message.cmd };
                });
    }.bind(this));

    ipcRenderer.on('message-callback', function(event, type, message) {

        switch (type) {

            case MESSAGE.GET_NODE_INFO:
                this.setState({
                    initNum: 1,
                    nodeVersion: message,
                });
                ipcRenderer.send('asynchronous-message', MESSAGE.GET_WEINRE_INFO);
                break;

            case MESSAGE.GET_WEINRE_INFO:
                this.setState({
                    initNum: 1,
                    weinre: message.split("--")[1],
                    weinreInstallButton: false
                });
                ipcRenderer.send('asynchronous-message', MESSAGE.GET_IP_INFO);
                break;
            case MESSAGE.GET_IP_INFO:
                this.setState({
                    initNum: 2,
                    ip: message,
                });
                break;
            case MESSAGE.WEINRE_NO_INSTALL:
                this.setState({
                    initNum: 1,
                    weinre: "未安装",
                    weinreInstallButton: true,
                    loading: false
                });
                break;
            case MESSAGE.WEINRE_INSTALL_COMPLETE:
                this.setState({
                    weinre: "安装完成请稍后...",
                    weinreInstallButton: false
                });
                ipcRenderer.send('asynchronous-message', MESSAGE.GET_WEINRE_INFO);
                break;
            case MESSAGE.START:
                this.setState({
                    loading: false,
                    consoleStr: message.split("\n"),
                });
                break;
        }
    }.bind(this));
}

installWeinre = () => {
    this.setState({
        weinreInstallButtonLoading: true,
        loading: true
    });
    ipcRenderer.send('asynchronous-message', MESSAGE.WEINRE_DO_INSTALL);
}

nextStep = () => {
    this.setState({
        initNum: 3,
        ipNextButton: true,
        weinreInstallButton: false,
        start: true,
    });
    let { ip, ipValue } = this.state;
    ipcRenderer.send('asynchronous-message', MESSAGE.START, ip[ipValue]);
}

handleIpChange = (e) => {
    this.setState({
        ipValue: e.target.value,
        ipNextButton: false
    });
}

openWin = (e) => {
    let { ip, ipValue } = this.state;
    ipcRenderer.send('asynchronous-message', MESSAGE.OPEN_WIN, ip[ipValue]);
}

toggle = () => {
    this.setState({
        collapsed: !this.state.collapsed,
    });
}

render() {
    const {
            initNum,
        nodeVersion,
        loading,
        ip,
        ipValue,
        weinre,
        weinreInstallButton,
        weinreInstallButtonLoading,
        start,
        consoleStr,
        ipNextButton,
        logStr
        } = this.state;


    return (
        <div>
            <Layout>
                <Header style={{ position: 'fixed', width: '100%' }}>
                    <Spin size="small" spinning={loading} />
                </Header>
                <Content style={{ marginTop: 64 }}>
                    <div style={{ background: '#fff', padding: 24, minHeight: 640 }}>
                        <div style={{ marginBottom: 30 }}>
                        </div>
                        <Steps direction="vertical" current={initNum}>
                            <Step title="检查 Node" description={nodeVersion} />
                            <Step title="检查 WebInspector Remote" description={
                                weinreInstallButton ?
                                    <div>
                                        <p>请先安装</p>
                                        <Button type="primary" ghost={true} style={{ marginTop: 20 }}
                                            icon="download"
                                            loading={weinreInstallButtonLoading}
                                            onClick={this.installWeinre}>
                                            install weinre
                                         </Button>
                                    </div>
                                    : weinre} />
                            <Step title="选择 ip" description={
                                <div>
                                    <RadioGroup onChange={this.handleIpChange} disabled={initNum == 2 ? false : true} value={ipValue}>{
                                        ip && ip.map(
                                            (item, index) => (
                                                <Radio style={{ display: 'block', height: '30px', lineHeight: '30px' }} key={item} value={index}>
                                                    {item}
                                                </Radio>
                                            )
                                        )}
                                    </RadioGroup>
                                    <div style={{ marginTop: 10 }}>
                                        <Button type="primary"
                                            icon="poweroff"
                                            disabled={ipNextButton}
                                            style={{ display: ip ? 'block' : 'none' }}
                                            onClick={this.nextStep}>
                                            启动
                                                </Button>
                                    </div>
                                </div>
                            } />


                        </Steps>


                        {
                            start ? <Alert message="使用此脚本注入您的网页 " type="warning"
                                description={`<script src ="http://${ip[ipValue]}:8089/target/target-script-min.js#anonymous"></script>`}
                                showIcon
                            /> : null
                        }

                        <Button type="primary"
                            disabled={!start}
                            style={{ marginTop: 10, display: start ? 'block' : 'none' }}
                            onClick={this.openWin}>
                            手动打开调试窗口
                            </Button>

                        <Card title="输出" style={{ width: 1150, marginTop: 10, display: start ? 'block' : 'none' }}>
                            <Spin size="small" spinning={loading} />
                            {
                                consoleStr.map(
                                    (item, index) => (<p key={item}>{item}</p>)
                                )
                            }
                        </Card>

                        <Card title="日志" style={{ width: 1150, marginTop: 10 }}>
                            {
                                logStr
                            }
                        </Card>

                    </div>
                </Content>
                <Footer style={{ textAlign: 'center' }}>
                    Copyleft ©2017 Created by Ethan     version 0.1.0
                    </Footer>
            </Layout>
        </div>
    )
}
}   