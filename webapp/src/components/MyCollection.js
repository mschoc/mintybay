import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'

const MyCollection = ({ marketplace, token, account }) => {
    const [loading, setLoading] = useState(true)
    const [myOwnedItems, setMyOwnedItems] = useState([])
    const [myListedItems, setMyListedItems] = useState([])

    // load my owned market items
    const loadMyOwnedMarketItems = async () => {
        const marketItemCount = await marketplace.marketItemCount()
        let myOwnedItems = []
        for (let i = 1; i <= marketItemCount; i++) {
            const item = await marketplace.marketItems(i)
            if (item.owner.toLowerCase() === account) {
                const uri = await token.tokenURI(item.tokenId)
                const response = await fetch(uri)
                const metadata = await response.json()
                myOwnedItems.push({
                    price: item.price,
                    itemId: item.id,
                    tokenId: item.tokenId,
                    tokenAddress: item.token,
                    seller: item.seller,
                    royaltyFeePermillage: item.royaltyFeePermillage,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image
                })
            }
        }
        setLoading(false)
        setMyOwnedItems(myOwnedItems)
    }

    // load my listed market items
    const loadMyListedMarketItems = async () => {
        const marketItemCount = await marketplace.marketItemCount()
        let myListedItems = []
        for (let i = 1; i <= marketItemCount; i++) {
            const item = await marketplace.marketItems(i)
            if (item.seller.toLowerCase() === account) {
                const uri = await token.tokenURI(item.tokenId)
                const response = await fetch(uri)
                const metadata = await response.json()
                myListedItems.push({
                    price: item.price,
                    itemId: item.id,
                    tokenId: item.tokenId,
                    tokenAddress: item.token,
                    seller: item.seller,
                    royaltyFeePermillage: item.royaltyFeePermillage,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image
                })
            }
        }
        setLoading(false)
        setMyListedItems(myListedItems)
    }

    // sell market item
    const sellMarketItem = async (item) => {
        await (await token.setApprovalForAll(marketplace.address, true)).wait()
        const marketPrice = ethers.utils.parseEther(item.price.toString())
        await (await marketplace.createMarketItem(item.tokenAddress, item.tokenId, marketPrice, item.royaltyFeePermillage)).wait()
        loadMyOwnedMarketItems()
        loadMyListedMarketItems()
    }

    // set price
    const setPriceForItem = async (item, sellingPrice) => {
        item.price = sellingPrice;
    }

    // effect hook for loading
    useEffect(() => {
        loadMyOwnedMarketItems()
        loadMyListedMarketItems()
    }, [])
    if (loading) return (
        <main>
            <h2>Loading NFT's...</h2>
        </main>
    )

    return (
        <div className="flex justify-center">
            <div className="px-5 container">
                <h2 style={{ paddingTop: "2rem" }}>My NFT Collection</h2>
                {myOwnedItems.length > 0 ?
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {myOwnedItems.map((item, i) => (
                            <Col key={i} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={item.image} />
                                    <Card.Body color="secondary">
                                        <Card.Title>{item.name}</Card.Title>
                                        <Card.Text>{item.description}</Card.Text>
                                    </Card.Body>
                                    <Card.Footer>
                                        <div className='d-grid'>
                                            <Button onClick={() => sellMarketItem(item)} variant="primary" size="lg">
                                                Sell for
                                            </Button>
                                            <Form.Control onChange={(e) => setPriceForItem(item, e.target.value)} size="lg" required type="number" placeholder={ethers.utils.formatEther(item.price)} />
                                        </div>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                : (
                    <h2>-</h2>
                )}
                <h2>My listed NFT's</h2>
                {myListedItems.length > 0 ?
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {myListedItems.map((item, i) => (
                            <Col key={i} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={item.image} />
                                    <Card.Body color="secondary">
                                        <Card.Title>{item.name}</Card.Title>
                                        <Card.Text>{item.description}</Card.Text>
                                    </Card.Body>
                                    <Card.Footer>Listed for {ethers.utils.formatEther(item.price)} ETH</Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                : (
                    <h2>-</h2>
                )}
            </div>             
        </div>
    );
}
export default MyCollection