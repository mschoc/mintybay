import { useState } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button } from 'react-bootstrap'
import { create as ipfsHttpClient } from 'ipfs-http-client'

const ipfsClient = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

const Create = ({ marketplace, token }) => {

    const [image, setImage] = useState('')
    const [price, setPrice] = useState(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')

    // upload metadata to ipfs
    const uploadToIPFS = async (event) => {
        event.preventDefault()
        const file = event.target.files[0]
        if (typeof file !== 'undefined') {
            try {
                const result = await ipfsClient.add(file)
                console.log(result)
                setImage(`https://ipfs.infura.io/ipfs/${result.path}`)
            } catch (error) {
                console.log("ipfs image upload error: ", error)
            }
        }
    }

    // create and place nft on market
    const createAndPlaceNFT = async () => {
        if (!image || !price || !name || !description) return
        try {
            const result = await ipfsClient.add(JSON.stringify({ image, price, name, description }))
            mintApproveCreate(result)
        } catch (error) {
            console.log("ipfs uri upload error: ", error)
        }
    }

    // mint nft, approve nft with marketplace address, create market item
    const mintApproveCreate = async (result) => {
        const uri = `https://ipfs.infura.io/ipfs/${result.path}`
        await (await token.mint(uri)).wait()
        const id = await token.tokenIdCount()
        await (await token.setApprovalForAll(marketplace.address, true)).wait()
        const marketPrice = ethers.utils.parseEther(price.toString())
        await (await marketplace.createMarketItem(token.address, id, marketPrice)).wait()
    }

    return (
        <div className="container-fluid mt-5">
            <div className="row">
                <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
                    <div className="content mx-auto">
                        <Row className="g-4">
                            <Form.Control type="file" required name="file" onChange={uploadToIPFS} />
                            <Form.Control onChange={(e) => setName(e.target.value)} size="lg" required type="text" placeholder="Name" />
                            <Form.Control onChange={(e) => setDescription(e.target.value)} size="lg" required as="textarea" placeholder="Description" />
                            <Form.Control onChange={(e) => setPrice(e.target.value)} size="lg" required type="number" placeholder="Price in ETH" />
                            <div className="d-grid px-0">
                                <Button onClick={createAndPlaceNFT} variant="primary" size="lg"> Create & Place NFT! </Button>
                            </div>
                        </Row>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Create