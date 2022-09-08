import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from 'react'
import { ethers } from "ethers"
import Nav from './Navbar';
import Market from './Market.js'
import Create from './Create.js'
import MyCollection from './MyCollection.js'
import Settings from './Settings.js'
import MarketplaceContractData from '../contractsData/Marketplace.json'
import MarketplaceAddress from '../contractsData/Marketplace-address.json'
import TokenContractData from '../contractsData/Token.json'
import TokenAddress from '../contractsData/Token-address.json'
import './App.css';

function App() {
    const [loading, setLoading] = useState(true)
    const [account, setAccount] = useState(null)
    const [token, setToken] = useState({})
    const [marketplace, setMarketplace] = useState({})

    // metamask connection
    const web3Handler = async () => {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0])
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        window.ethereum.on('accountsChanged', async function (accounts) {
            setAccount(accounts[0])
            await web3Handler()
        })
        loadContracts(signer)
    }

    // load contract data
    const loadContracts = async (signer) => {
        const marketplace = new ethers.Contract(MarketplaceAddress.address, MarketplaceContractData.abi, signer)
        setMarketplace(marketplace)
        const token = new ethers.Contract(TokenAddress.address, TokenContractData.abi, signer)
        setToken(token)
        setLoading(false)
    }

    return (
        <BrowserRouter>
            <div className="App">

                <Nav web3Handler={web3Handler} account={account} />
                <div>
                    {loading ? (
                        <main>
                            <h2 style={{ paddingTop: "2rem" }}>Please connect Wallet!</h2>
                        </main>
                    ) : (
                        <Routes>
                            <Route path="/" element={
                                <Market marketplace={marketplace} token={token} />
                            } />
                            <Route path="/create" element={
                                <Create marketplace={marketplace} token={token} account={account} />
                            } />
                            <Route path="/mycollection" element={
                                <MyCollection marketplace={marketplace} token={token} account={account}/>
                            } />
                            <Route path="/settings" element={
                                <Settings marketplace={marketplace} account={account}/>
                            } />
                        </Routes>
                    )}
                </div>
                
            </div>
        </BrowserRouter>
    );
}

export default App;
