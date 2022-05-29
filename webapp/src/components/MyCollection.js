import { useState, useEffect } from 'react'
import { Row, Col, Card } from 'react-bootstrap'

const MyCollection = ({ marketplace, token, account }) => {
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState([])

    // load my owned market items
    const loadMyOwnedMarketItems = async () => {
        const marketItemCount = await marketplace.marketItemCount()
        let items = []
        for (let i = 1; i <= marketItemCount; i++) {
            const item = await marketplace.marketItems(i)
            if (item.owner.toLowerCase() === account) {
                const uri = await token.tokenURI(item.tokenId)
                const response = await fetch(uri)
                const metadata = await response.json()
                items.push({
                    price: item.price,
                    itemId: item.id,
                    seller: item.seller,
                    name: metadata.name,
                    description: metadata.description,
                    image: metadata.image
                })
            }
        }
        setLoading(false)
        setItems(items)
    }

    // effect hook for loading
    useEffect(() => {
        loadMyOwnedMarketItems()
    }, [])
    if (loading) return (
        <main>
            <h2>Loading NFT's...</h2>
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
                                        <Card.Text>{item.description}</Card.Text>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
                : (
                    <main>
                        <h2>No NFT's in my collection</h2>
                    </main>
                )}
        </div>
    );
}
export default MyCollection