import { useState } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button } from 'react-bootstrap'
import { Buffer } from 'buffer'

const ipfsClient = require('ipfs-http-client');
let projectId = localStorage.getItem("ipfsProjectKey");
let projectSecret = localStorage.getItem("ipfsProjectSecret");
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
const client = ipfsClient.create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth,
    },
})

const Create = ({ marketplace, token, account }) => {

    const [image, setImage] = useState('')
    const [price, setPrice] = useState(null)
    const [royaltyFeePercentage, setRoyaltyFeePercentage] = useState(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [creatorAddress, setCreatorAddress] = useState('')

    // upload metadata to ipfs
    const uploadToIPFS = async (event) => {
        event.preventDefault()
        const file = event.target.files[0]
        if (typeof file !== 'undefined') {
            try {
                const result = await client.add(file)
                console.log(result)
                setImage(`https://ipfs.io/ipfs/${result.path}`)
            } catch (error) {
                console.log("ipfs image upload error: ", error)
            }
        }
    }

    // create and sell nft on market
    const createAndSellNFT = async () => {
        setCreatorAddress(account)
        if (!image || !price || !name || !description || !creatorAddress) return
        try {
            const result = await client.add(JSON.stringify({ image, price, name, description, creatorAddress }))
            mintApproveCreate(result)
        } catch (error) {
            console.log("ipfs uri upload error: ", error)
        }
    }

    // mint nft, approve nft with marketplace address, create market item
    const mintApproveCreate = async (result) => {
        const uri = `https://ipfs.io/ipfs/${result.path}`
        await (await token.mint(uri)).wait()
        const id = await token.tokenIdCount()
        await (await token.setApprovalForAll(marketplace.address, true)).wait()
        const marketPrice = ethers.utils.parseEther(price.toString())
        const royaltyFeePermillage = parseInt((royaltyFeePercentage*10), 10)
        await (await marketplace.createMarketItem(token.address, id, marketPrice, royaltyFeePermillage)).wait()
    }

    return (
        <div className="container-fluid mt-5">
            <div className="row">
                <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
                    <div className="content mx-auto">
                    <h2 style={{ paddingTop: "2rem", paddingBottom: "2em" }}>Create your own NFT! &#x1F60E;</h2>
                        <Row className="g-4">
                            <Form.Control type="file" required name="file" onChange={uploadToIPFS} />
                            <Form.Control onChange={(e) => setName(e.target.value)} size="lg" required type="text" placeholder="Name" />
                            <Form.Control onChange={(e) => setDescription(e.target.value)} size="lg" required as="textarea" placeholder="Description" />
                            <Form.Control onChange={(e) => setPrice(e.target.value)} size="lg" required type="number" placeholder="Price in ETH" />
                            <Form.Control onChange={(e) => setRoyaltyFeePercentage(e.target.value)} size="lg" required type="number" placeholder="Royalty fee in percent"/>
                            <div className="d-grid px-0">
                                <Button onClick={createAndSellNFT} variant="primary" size="lg"> Create & Sell NFT! </Button>
                            </div>
                        </Row>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Create