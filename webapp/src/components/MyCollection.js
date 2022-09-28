import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'

const MyCollection = ({ marketplace, token, account }) => {
    const [loading, setLoading] = useState(true)
    const [myOwnedItems, setMyOwnedItems] = useState([])
    const [myListedItems, setMyListedItems] = useState([])
    const [myOffers, setMyOffers] = useState([])

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
                let creatorName = await marketplace.getAccountName(metadata.creatorAddress)
                if(creatorName === ""){
                    creatorName = (metadata.creatorAddress).slice(0, 4) + '...' + (metadata.creatorAddress).slice(38, 42);
                }
                myOwnedItems.push({
                    price: item.price,
                    itemId: item.id,
                    tokenId: item.tokenId,
                    tokenAddress: item.token,
                    seller: item.seller,
                    royaltyFeePermillage: item.royaltyFeePermillage,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image,
                    creatorName: creatorName
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
                let creatorName = await marketplace.getAccountName(metadata.creatorAddress)
                if(creatorName === ""){
                    creatorName = (metadata.creatorAddress).slice(0, 4) + '...' + (metadata.creatorAddress).slice(38, 42);
                }

                const offer = await marketplace.getHighestOffer(i);
                const offerer = offer.offerer;
                const offerPrice = offer.price;

                myListedItems.push({
                    price: item.price,
                    itemId: item.id,
                    tokenId: item.tokenId,
                    tokenAddress: item.token,
                    seller: item.seller,
                    royaltyFeePermillage: item.royaltyFeePermillage,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image,
                    offerer: offerer,
                    offerPrice: offerPrice,
                    creatorName: creatorName
                })
            }
        }
        setLoading(false)
        setMyListedItems(myListedItems)
    }

    // load my offers
    const loadMyOffers = async () => {
        const marketItemCount = await marketplace.marketItemCount()
        let myOffers = []
        for (let i = 1; i <= marketItemCount; i++) {
            const item = await marketplace.marketItems(i)
            const offerer = account;
            const offer = await marketplace.getOffers(i, offerer);
            const offerPrice = offer.price;

            if (offerPrice !== undefined && offerPrice > 0) {
                const uri = await token.tokenURI(item.tokenId)
                const response = await fetch(uri)
                const metadata = await response.json()
                let creatorName = await marketplace.getAccountName(metadata.creatorAddress)
                if(creatorName === ""){
                    creatorName = (metadata.creatorAddress).slice(0, 4) + '...' + (metadata.creatorAddress).slice(38, 42);
                }

                myOffers.push({
                    price: item.price,
                    itemId: item.id,
                    tokenId: item.tokenId,
                    tokenAddress: item.token,
                    seller: item.seller,
                    royaltyFeePermillage: item.royaltyFeePermillage,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image,
                    offerer: offerer, 
                    offerPrice: offerPrice,
                    creatorName: creatorName
                })
            }
        }
        setLoading(false)
        setMyOffers(myOffers)
    }

    // sell market item
    const sellMarketItem = async (item) => {
        await (await token.setApprovalForAll(marketplace.address, true)).wait()
        const marketPrice = ethers.utils.parseEther(item.price.toString())
        await (await marketplace.createMarketItem(item.tokenAddress, item.tokenId, marketPrice, item.royaltyFeePermillage)).wait()
        loadMyOwnedMarketItems()
        loadMyListedMarketItems()
        loadMyOffers()
    }

    // set price
    const setPriceForItem = async (item, sellingPrice) => {
        item.price = sellingPrice;
    }

    // accept offer
    const acceptOffer = async (item) => {
        await (await marketplace.acceptOffer(item.itemId, item.offerer)).wait()
        loadMyOwnedMarketItems()
        loadMyListedMarketItems()
        loadMyOffers()
    }

    // withdraw offer
    const withdrawOffer = async (item) => {
        await (await marketplace.withdrawOffer(item.itemId)).wait()
        loadMyOwnedMarketItems()
        loadMyListedMarketItems()
        loadMyOffers()
    }

    // effect hook for loading
    useEffect(() => {
        loadMyOwnedMarketItems()
        loadMyListedMarketItems()
        loadMyOffers()
    }, [])
    if (loading) return (
        <main>
            <h2 style={{ paddingTop: "2rem", paddingBottom: "2em" }}>Loading NFT's... &#x23F3;</h2>
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
                                        <Card.Text style={{ fontSize: "0.8rem" }} >by {item.creatorName}</Card.Text>
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
                                        <Card.Text style={{ fontSize: "0.8rem" }} >by {item.creatorName}</Card.Text>
                                        <Card.Text>{item.description}</Card.Text>
                                    </Card.Body>
                                    <Card.Footer>Listed for {ethers.utils.formatEther(item.price)} ETH</Card.Footer>
                                    {item.offerPrice > 0 ?
                                    <Card.Footer>
                                        <Card.Text style={{ paddingBottim: "1rem" }}>Offer of {ethers.utils.formatEther(item.offerPrice)} ETH by {item.creatorName}</Card.Text>
                                        <div className='d-grid'>
                                            <Button onClick={() => acceptOffer(item)} variant="primary" size="lg">
                                                Accept
                                            </Button>
                                        </div>
                                    </Card.Footer>
                                    : (
                                    <Card.Footer>
                                        No offers received
                                    </Card.Footer>
                                    )}
                                </Card>
                            </Col>
                        ))}
                    </Row>
                : (
                    <h2>-</h2>
                )}

                <h2>My Offers</h2>
                {myOffers.length > 0 ?
                    <Row xs={1} md={2} lg={4} className="g-4 py-5">
                        {myOffers.map((item, i) => (
                            <Col key={i} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={item.image} />
                                    <Card.Body color="secondary">
                                        <Card.Title>{item.name}</Card.Title>
                                        <Card.Text style={{ fontSize: "0.8rem" }} >by {item.creatorName}</Card.Text>
                                        <Card.Text>{item.description}</Card.Text>
                                    </Card.Body>
                                    <Card.Footer>
                                        <Card.Text style={{ paddingBottim: "1rem" }}>You offered {ethers.utils.formatEther(item.offerPrice)} ETH </Card.Text>
                                        <div className='d-grid'>
                                            <Button onClick={() => withdrawOffer(item)} variant="primary" size="lg">
                                                Withdraw offer
                                            </Button>
                                        </div>
                                    </Card.Footer>
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