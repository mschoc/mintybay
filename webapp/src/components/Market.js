import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'

const Market = ({ marketplace, token }) => {
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState([])

    // load unsold market items 
    const loadUnsoldMarketItems = async () => {
        const marketItemCount = await marketplace.marketItemCount()
        let items = []
        for (let i = 1; i <= marketItemCount; i++) {
            const item = await marketplace.marketItems(i)
            if (!item.sold) {
                const uri = await token.tokenURI(item.tokenId)
                const response = await fetch(uri)
                const metadata = await response.json()
                const priceWithFees = await marketplace.getCalculatedTotalPrice(item.id)
                let creatorName = await marketplace.getAccountName(metadata.creatorAddress)
                if(creatorName === ""){
                    creatorName = (metadata.creatorAddress).slice(0, 4) + '...' + (metadata.creatorAddress).slice(38, 42);
                }
                
                items.push({
                    price: item.price,
                    priceWithFees: priceWithFees,
                    itemId: item.id,
                    seller: item.seller,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image,
                    offerPrice: 0,
                    creatorName: creatorName
                })
            }
        }
        setLoading(false)
        setItems(items)
    }

    // buy market item
    const buyMarketItem = async (item) => {
        await (await marketplace.buyMarketItem(item.itemId, { value: item.priceWithFees })).wait()
        loadUnsoldMarketItems()
    }

    // make offer
    const makeOffer = async (item) => {
        const offerPrice = ethers.utils.parseEther(item.offerPrice.toString())
        await (await marketplace.makeOffer(item.itemId, { value: offerPrice })).wait()
        loadUnsoldMarketItems()
    }

    // set price
    const setOfferPriceForItem = async (item, offerPrice) => {
        item.offerPrice = offerPrice;
    }

    // effect hook for loading
    useEffect(() => {
        loadUnsoldMarketItems()
    }, [])
    if (loading) return (
        <main>
            <h2 style={{ paddingTop: "2rem", paddingBottom: "2em" }}>Loading NFT's... &#x23F3;</h2>
        </main>
    )

    return (
        <div className="flex justify-center">
            {items.length > 0 ?
                <div className="px-5 container">
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {items.map((item, i) => (
                            <Col key={i} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={item.image} />
                                    <Card.Body color="secondary">
                                        <Card.Title>{item.name}</Card.Title>
                                        <Card.Text style={{ fontSize: "0.8rem" }} >by {item.creatorName}</Card.Text>
                                        <Card.Text>{item.description}</Card.Text>
                                    </Card.Body>
                                    <Card.Footer>
                                        <div className='d-grid'>
                                            <Button onClick={() => buyMarketItem(item)} variant="primary" size="lg">
                                                Buy for {ethers.utils.formatEther(item.priceWithFees)} ETH
                                            </Button>
                                        </div>
                                    </Card.Footer>
                                    <Card.Footer>
                                        <div className='d-grid'>
                                            <Button onClick={() => makeOffer(item)} variant="primary" size="lg">
                                                Make Offer
                                            </Button>
                                            <Form.Control onChange={(e) => setOfferPriceForItem(item, e.target.value)} size="lg" required type="number" placeholder={ethers.utils.formatEther(item.price)} />
                                        </div>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
                : (
                    <main>
                        <h2 style={{ paddingTop: "2rem" }}>Currently no NFT's at sale</h2>
                    </main>
                )}
        </div>
    );
}
export default Market