import { useState, useEffect } from 'react'
import { Row, Form, Button } from 'react-bootstrap'

const Settings = ({marketplace, account}) => {

    const [ipfsProjectKey, setIpfsProjectKey] = useState('')
    const [ipfsProjectSecret, setIpfsProjectSecret] = useState('')
    const [accountName, setAccountName] = useState('')

    const saveApiInfo = async () => {
        if (!ipfsProjectKey || !ipfsProjectSecret) return
        localStorage.setItem("ipfsProjectKey", ipfsProjectKey);
        localStorage.setItem("ipfsProjectSecret", ipfsProjectSecret);
    }

    const saveAccountName = async () => {
        if (!accountName) return
        (await marketplace.setAccountName(accountName)).wait()
    }

    const setCurrentAccountName = async () => {
        const currentAccountName = await marketplace.getAccountName(account)
        setAccountName(currentAccountName)
    }

    useEffect(() => {
        setCurrentAccountName();
      }, []);

    return (
        <div className="container-fluid mt-5">
            <div className="row">
                <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
                    <div className="content mx-auto">
                        <h2 style={{ paddingTop: "2rem", paddingBottom: "1em" }}>IPFS API Configuration</h2>
                        <Row className="g-4">
                            <Form.Control onChange={(e) => setIpfsProjectKey(e.target.value)} size="lg" required type="text" placeholder="IPFS_PROJECT_ID &#x1F511;" />
                            <Form.Control onChange={(e) => setIpfsProjectSecret(e.target.value)} size="lg" required type="password" placeholder="IPFS_PROJECT_SECRET &#x1F511;" />
                            <div className="d-grid px-0">
                                <Button onClick={saveApiInfo} variant="primary" size="lg"> Save API Information </Button>
                            </div>
                        </Row>
                        <h2 style={{ paddingTop: "3rem", paddingBottom: "1em" }}>Set your Account Name</h2>
                        <Row className="g-4">
                            <Form.Control onChange={(e) => setAccountName(e.target.value)} size="lg" required type="text" placeholder={(accountName == "") ? "Account Name" : accountName} />
                            <div className="d-grid px-0">
                                <Button onClick={saveAccountName} variant="primary" size="lg"> Save Account Name (requires GAS)</Button>
                            </div>
                        </Row>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Settings
